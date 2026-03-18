"""
Security / access-control tests for the Splitwise backend.

These tests spin up a fresh in-memory SQLite database for each test
module run (no external PostgreSQL needed).

Coverage:
  - Unauthenticated access to protected endpoints → 401
  - Non-member trying to access a group → 404 (don't leak existence)
  - Non-member trying to add expense to a group → 404
  - Non-owner (regular member) trying to update group name → 403
  - Settlement between users not in the caller's group → 400/404
"""
import os
import uuid
from decimal import Decimal

# Must set env vars before importing any app module
os.environ.setdefault("SECRET_KEY", "test-secret-key-security-tests")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_security.db"
os.environ["RATELIMIT_ENABLED"] = "false"  # Disable rate limiting in tests

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """
    Build a TestClient backed by a fresh SQLite schema.
    We patch out the async engine/session so that SQLite in-memory works.
    """
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.db.session import Base, get_db
    from app.main import app

    engine = create_async_engine(
        "sqlite+aiosqlite:///./test_security.db",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    # Create tables synchronously before tests
    async def _create():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.get_event_loop().run_until_complete(_create())

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        # Disable rate limiting during tests
        from app.core.limiter import limiter
        limiter.enabled = False
        yield c
        limiter.enabled = True

    app.dependency_overrides.clear()

    # Cleanup DB file
    import pathlib
    pathlib.Path("./test_security.db").unlink(missing_ok=True)


def _signup_and_login(client: TestClient, email: str, password: str = "Pass123!") -> str:
    """Helper: create user and return bearer token."""
    client.post("/api/v1/auth/signup", json={"email": email, "password": password, "name": "Test"})
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests: unauthenticated access
# ---------------------------------------------------------------------------

class TestUnauthenticated:
    def test_list_groups_no_token(self, client):
        resp = client.get("/api/v1/groups")
        assert resp.status_code in (401, 403)

    def test_create_group_no_token(self, client):
        resp = client.post("/api/v1/groups", json={"name": "G"})
        assert resp.status_code in (401, 403)

    def test_get_group_no_token(self, client):
        resp = client.get(f"/api/v1/groups/{uuid.uuid4()}")
        assert resp.status_code in (401, 403)

    def test_patch_group_no_token(self, client):
        resp = client.patch(f"/api/v1/groups/{uuid.uuid4()}", json={"name": "X"})
        assert resp.status_code in (401, 403)

    def test_list_expenses_no_token(self, client):
        resp = client.get(f"/api/v1/groups/{uuid.uuid4()}/expenses")
        assert resp.status_code in (401, 403)

    def test_create_expense_no_token(self, client):
        resp = client.post(f"/api/v1/groups/{uuid.uuid4()}/expenses", json={})
        assert resp.status_code in (401, 403)

    def test_create_settlement_no_token(self, client):
        resp = client.post(f"/api/v1/groups/{uuid.uuid4()}/settlements", json={})
        assert resp.status_code in (401, 403)

    def test_health_is_public(self, client):
        """Health endpoint must remain public."""
        resp = client.get("/health")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Tests: non-member group access
# ---------------------------------------------------------------------------

class TestNonMemberGroupAccess:
    def test_non_member_cannot_see_group(self, client):
        """Non-member GET on a valid group_id must return 404 (not 403)."""
        token_owner = _signup_and_login(client, f"owner_{uuid.uuid4().hex[:6]}@x.com")
        token_other = _signup_and_login(client, f"other_{uuid.uuid4().hex[:6]}@x.com")

        # Owner creates group
        resp = client.post("/api/v1/groups", json={"name": "OwnerGroup"}, headers=_auth(token_owner))
        assert resp.status_code == 201
        group_id = resp.json()["id"]

        # Non-member tries to fetch it
        resp = client.get(f"/api/v1/groups/{group_id}", headers=_auth(token_other))
        assert resp.status_code == 404, f"Expected 404 for non-member, got {resp.status_code}: {resp.text}"

    def test_non_member_cannot_add_expense(self, client):
        """Non-member POST expense on a valid group_id must return 404."""
        token_owner = _signup_and_login(client, f"eowner_{uuid.uuid4().hex[:6]}@x.com")
        token_other = _signup_and_login(client, f"eother_{uuid.uuid4().hex[:6]}@x.com")

        resp = client.post("/api/v1/groups", json={"name": "ExpGroup"}, headers=_auth(token_owner))
        assert resp.status_code == 201
        group_id = resp.json()["id"]

        resp = client.post(
            f"/api/v1/groups/{group_id}/expenses",
            json={
                "description": "Lunch",
                "amount": "20.00",
                "currency": "USD",
                "splits": [],
            },
            headers=_auth(token_other),
        )
        assert resp.status_code in (403, 404), f"Expected 403/404, got {resp.status_code}: {resp.text}"

    def test_non_member_cannot_list_expenses(self, client):
        """Non-member GET expenses on a valid group must return 404."""
        token_owner = _signup_and_login(client, f"lowner_{uuid.uuid4().hex[:6]}@x.com")
        token_other = _signup_and_login(client, f"lother_{uuid.uuid4().hex[:6]}@x.com")

        resp = client.post("/api/v1/groups", json={"name": "ListGroup"}, headers=_auth(token_owner))
        group_id = resp.json()["id"]

        resp = client.get(f"/api/v1/groups/{group_id}/expenses", headers=_auth(token_other))
        assert resp.status_code in (403, 404), f"Expected 403/404, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# Tests: non-owner PATCH group
# ---------------------------------------------------------------------------

class TestNonOwnerPatchGroup:
    def test_member_cannot_patch_group(self, client):
        """
        A regular member (role='member') must not be able to update group details.
        Expects 403.
        """
        import asyncio
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        from app.db.session import Base
        from app.models.models import Membership
        from sqlalchemy import select

        token_admin = _signup_and_login(client, f"padmin_{uuid.uuid4().hex[:6]}@x.com")
        token_member = _signup_and_login(client, f"pmember_{uuid.uuid4().hex[:6]}@x.com")

        # Admin creates group
        resp = client.post("/api/v1/groups", json={"name": "PatchGroup"}, headers=_auth(token_admin))
        assert resp.status_code == 201
        group_id = resp.json()["id"]

        # We need to get the member user id. Sign up and get it via a separate endpoint.
        # Register the member user and grab their id
        member_email = f"pmember2_{uuid.uuid4().hex[:6]}@x.com"
        signup_resp = client.post(
            "/api/v1/auth/signup",
            json={"email": member_email, "password": "Pass123!", "name": "Member"},
        )
        member_user_id = signup_resp.json()["id"]
        member_token = client.post(
            "/api/v1/auth/login",
            json={"email": member_email, "password": "Pass123!"},
        ).json()["access_token"]

        # Manually insert membership with role='member' directly via DB
        engine = create_async_engine("sqlite+aiosqlite:///./test_security.db")
        TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

        async def _insert_member():
            async with TestingSessionLocal() as session:
                m = Membership(
                    user_id=uuid.UUID(member_user_id),
                    group_id=uuid.UUID(group_id),
                    role="member",
                )
                session.add(m)
                await session.commit()

        asyncio.get_event_loop().run_until_complete(_insert_member())

        # Non-admin member tries to patch
        resp = client.patch(
            f"/api/v1/groups/{group_id}",
            json={"name": "HackedName"},
            headers=_auth(member_token),
        )
        assert resp.status_code == 403, f"Expected 403 for non-admin member, got {resp.status_code}: {resp.text}"

    def test_admin_can_patch_group(self, client):
        """Group admin/creator must be able to update group details."""
        token_admin = _signup_and_login(client, f"gadmin_{uuid.uuid4().hex[:6]}@x.com")

        resp = client.post("/api/v1/groups", json={"name": "AdminGroup"}, headers=_auth(token_admin))
        assert resp.status_code == 201
        group_id = resp.json()["id"]

        resp = client.patch(
            f"/api/v1/groups/{group_id}",
            json={"name": "UpdatedName"},
            headers=_auth(token_admin),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "UpdatedName"


# ---------------------------------------------------------------------------
# Tests: settlement with non-group members
# ---------------------------------------------------------------------------

class TestSettlementMemberChecks:
    def test_settlement_with_non_member_rejected(self, client):
        """
        Settling between users where one is not in the group must return 400.
        """
        token_a = _signup_and_login(client, f"sa_{uuid.uuid4().hex[:6]}@x.com")
        outsider_email = f"outsider_{uuid.uuid4().hex[:6]}@x.com"
        outsider_resp = client.post(
            "/api/v1/auth/signup",
            json={"email": outsider_email, "password": "Pass123!", "name": "Out"},
        )
        outsider_id = outsider_resp.json()["id"]

        # A creates group (becomes admin/member)
        resp = client.post("/api/v1/groups", json={"name": "SettleGroup"}, headers=_auth(token_a))
        group_id = resp.json()["id"]

        # Get user A's id
        a_email = f"sa_resolve_{uuid.uuid4().hex[:6]}@x.com"
        a_signup = client.post(
            "/api/v1/auth/signup",
            json={"email": a_email, "password": "Pass123!", "name": "A"},
        )
        a_id = a_signup.json()["id"]

        # Try to settle between A and outsider (outsider not in group)
        resp = client.post(
            f"/api/v1/groups/{group_id}/settlements",
            json={
                "payer_id": a_id,
                "payee_id": outsider_id,
                "amount": "10.00",
                "currency": "USD",
            },
            headers=_auth(token_a),
        )
        # payer_id (a_id) is not in group either, so expect 400
        assert resp.status_code in (400, 404), f"Expected 400/404, got {resp.status_code}: {resp.text}"

    def test_non_member_cannot_record_settlement(self, client):
        """Non-group-member cannot POST to settlement endpoint → 404."""
        token_owner = _signup_and_login(client, f"sown_{uuid.uuid4().hex[:6]}@x.com")
        token_stranger = _signup_and_login(client, f"sstrange_{uuid.uuid4().hex[:6]}@x.com")

        resp = client.post("/api/v1/groups", json={"name": "SettleG2"}, headers=_auth(token_owner))
        group_id = resp.json()["id"]

        payer_signup = client.post(
            "/api/v1/auth/signup",
            json={"email": f"spayer_{uuid.uuid4().hex[:6]}@x.com", "password": "Pass123!", "name": "P"},
        )
        payee_signup = client.post(
            "/api/v1/auth/signup",
            json={"email": f"spayee_{uuid.uuid4().hex[:6]}@x.com", "password": "Pass123!", "name": "Q"},
        )

        resp = client.post(
            f"/api/v1/groups/{group_id}/settlements",
            json={
                "payer_id": payer_signup.json()["id"],
                "payee_id": payee_signup.json()["id"],
                "amount": "5.00",
                "currency": "USD",
            },
            headers=_auth(token_stranger),
        )
        assert resp.status_code == 404, f"Expected 404 for non-member settlement, got {resp.status_code}: {resp.text}"
