"""
Tests for auth + user onboarding (Issue #13):
- Signup returns access_token + refresh_token
- Login returns access_token + refresh_token
- POST /auth/refresh issues new tokens
- POST /auth/logout revokes refresh token
- GET /users/me returns profile
- PATCH /users/me updates profile
"""
import os
import uuid

os.environ.setdefault("SECRET_KEY", "test-secret-key-auth-onboarding")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_auth_onboarding.db"
os.environ["RATELIMIT_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.db.session import Base, get_db
    from app.main import app

    engine = create_async_engine(
        "sqlite+aiosqlite:///./test_auth_onboarding.db",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async def _create():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.get_event_loop().run_until_complete(_create())

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        from app.core.limiter import limiter
        limiter.enabled = False
        yield c
        limiter.enabled = True

    app.dependency_overrides.clear()

    import pathlib
    pathlib.Path("./test_auth_onboarding.db").unlink(missing_ok=True)


def _unique_email():
    return f"user_{uuid.uuid4().hex[:8]}@test.com"


class TestSignup:
    def test_signup_returns_tokens(self, client):
        resp = client.post("/api/v1/auth/signup", json={
            "email": _unique_email(),
            "password": "StrongPass1!",
            "name": "Alice",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email(self, client):
        email = _unique_email()
        client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "A"})
        resp = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "B"})
        assert resp.status_code == 400


class TestLogin:
    def test_login_returns_tokens(self, client):
        email = _unique_email()
        client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "Bob"})
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client):
        email = _unique_email()
        client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "C"})
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong"})
        assert resp.status_code == 401


class TestTokenRefresh:
    def test_refresh_returns_new_tokens(self, client):
        email = _unique_email()
        signup = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "D"})
        refresh_token = signup.json()["refresh_token"]

        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_rotation_revokes_old(self, client):
        email = _unique_email()
        signup = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "E"})
        refresh_token = signup.json()["refresh_token"]

        # Use it once
        client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        # Using the old one again should fail
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 401

    def test_invalid_refresh_token(self, client):
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-token"})
        assert resp.status_code == 401


class TestLogout:
    def test_logout_revokes_refresh_token(self, client):
        email = _unique_email()
        signup = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": "F"})
        refresh_token = signup.json()["refresh_token"]

        resp = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert resp.status_code == 204

        # Refresh should now fail
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 401


class TestUserProfile:
    def _signup(self, client, name="ProfileUser") -> tuple[str, str]:
        email = _unique_email()
        resp = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "name": name})
        return email, resp.json()["access_token"]

    def test_get_me(self, client):
        email, token = self._signup(client, "GetMe")
        resp = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == email
        assert data["display_name"] == "GetMe"
        assert "id" in data

    def test_patch_me_display_name(self, client):
        _, token = self._signup(client, "OldName")
        resp = client.patch(
            "/api/v1/users/me",
            json={"display_name": "NewName"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "NewName"

    def test_patch_me_email(self, client):
        _, token = self._signup(client, "EmailChanger")
        new_email = _unique_email()
        resp = client.patch(
            "/api/v1/users/me",
            json={"email": new_email},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == new_email

    def test_patch_me_email_conflict(self, client):
        email1, _ = self._signup(client, "User1")
        _, token2 = self._signup(client, "User2")
        resp = client.patch(
            "/api/v1/users/me",
            json={"email": email1},
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert resp.status_code == 400

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code in (401, 403)
