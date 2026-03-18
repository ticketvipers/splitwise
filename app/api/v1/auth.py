import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import urllib.parse

from app.core.security import verify_password, get_password_hash, create_access_token
from app.db.session import get_db
from app.core.limiter import limiter
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import SignupRequest, LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# In-memory stores (suitable for single-process deployments)
# state → timestamp (expires after 10 minutes)
_oauth_states: dict[str, float] = {}
_OAUTH_STATE_TTL = 600  # seconds

# exchange_code → (jwt, timestamp) (expires after 60 seconds)
_exchange_codes: dict[str, tuple[str, float]] = {}
_EXCHANGE_CODE_TTL = 60  # seconds


def _purge_expired_states():
    now = time.time()
    expired = [k for k, ts in _oauth_states.items() if now - ts > _OAUTH_STATE_TTL]
    for k in expired:
        del _oauth_states[k]


def _purge_expired_codes():
    now = time.time()
    expired = [k for k, (_, ts) in _exchange_codes.items() if now - ts > _EXCHANGE_CODE_TTL]
    for k in expired:
        del _exchange_codes[k]


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=get_password_hash(body.password),
        display_name=body.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/google")
async def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    _purge_expired_states()
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = time.time()

    params = urllib.parse.urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    })
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
async def google_callback(code: str, state: str | None = None, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    # Verify CSRF state parameter
    _purge_expired_states()
    if not state or state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or missing OAuth state parameter")
    state_ts = _oauth_states.pop(state)
    if time.time() - state_ts > _OAUTH_STATE_TTL:
        raise HTTPException(status_code=400, detail="OAuth state parameter expired")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code")
        google_tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_tokens['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google profile")
        profile = userinfo_resp.json()

    google_id = profile.get("sub")
    email = profile.get("email")
    name = profile.get("name") or email.split("@")[0]

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google profile")

    # Upsert: find by google_id, then by email, else create
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_id = google_id  # link existing account
        else:
            user = User(email=email, display_name=name, google_id=google_id, hashed_password=None)
            db.add(user)

    await db.commit()
    await db.refresh(user)

    jwt = create_access_token({"sub": str(user.id)})

    # Issue a short-lived exchange code instead of putting JWT in the redirect URL
    _purge_expired_codes()
    exchange_code = secrets.token_urlsafe(32)
    _exchange_codes[exchange_code] = (jwt, time.time())

    return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback?code={exchange_code}")


@router.post("/exchange", response_model=TokenResponse)
async def exchange_code(request: Request):
    """Exchange a one-time code (from OAuth callback) for a JWT access token."""
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing exchange code")

    _purge_expired_codes()
    entry = _exchange_codes.pop(code, None)
    if entry is None:
        raise HTTPException(status_code=400, detail="Invalid or expired exchange code")

    jwt, ts = entry
    if time.time() - ts > _EXCHANGE_CODE_TTL:
        raise HTTPException(status_code=400, detail="Exchange code expired")

    return TokenResponse(access_token=jwt)
