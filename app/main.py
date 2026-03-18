import os
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.api.v1 import auth, groups, expenses, settlements

tags_metadata = [
    {
        "name": "auth",
        "description": "User registration and authentication. Returns a Bearer JWT token.",
    },
    {
        "name": "groups",
        "description": "Manage expense groups, memberships, and view group balances.",
    },
    {
        "name": "expenses",
        "description": "Create, list, and manage expenses within a group.",
    },
    {
        "name": "settlements",
        "description": "Record and list payments between group members to settle debts.",
    },
    {
        "name": "balances",
        "description": "Compute net balances and simplified debt for a group.",
    },
]

app = FastAPI(
    title="Splitwise API",
    description=(
        "An API-first expense-sharing service. All protected endpoints require a "
        "Bearer JWT token obtained from `/api/v1/auth/login`.\n\n"
        "See `API_CONVENTIONS.md` in the repository for full versioning, error, "
        "pagination, and ID conventions."
    ),
    version="1.0.0",
    contact={
        "name": "Splitwise API Support",
        "url": "https://github.com/ticketvipers/splitwise",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=tags_metadata,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware — origins from CORS_ORIGINS env var (comma-separated)
_cors_raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Request ID middleware ──────────────────────────────────────────────────────

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Exception handlers ────────────────────────────────────────────────────────

def _status_to_code(status: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
        500: "internal_error",
    }.get(status, "error")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": _status_to_code(exc.status_code),
                "message": exc.detail,
            },
            "request_id": request_id,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    errors = [
        {
            "code": "validation_error",
            "message": str(e["msg"]),
            "field": ".".join(str(x) for x in e["loc"]),
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"errors": errors, "request_id": request_id},
    )


app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(settlements.router, prefix="/api/v1")


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        contact=app.contact,
        license_info=app.license_info,
        tags=tags_metadata,
        routes=app.routes,
    )
    # Add Bearer JWT security scheme
    schema.setdefault("components", {})
    schema["components"].setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token obtained from POST /api/v1/auth/login",
    }
    # Apply security globally (individual public routes can override with [])
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore


@app.get("/health")
async def health():
    return {"status": "ok"}
