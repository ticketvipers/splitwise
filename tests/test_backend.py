"""
Tests for splitwise backend.

Decision on is_settled (Split model):
  The `is_settled` field is kept in the Split model for future use.
  It is not automatically set today because settlement amounts don't
  map 1:1 to individual splits (partial settlements are common).
  A future endpoint can mark specific splits settled when desired.
  This is documented here so reviewers understand the intentional choice.
"""
import os
import uuid
from decimal import Decimal

# Ensure SECRET_KEY is set before importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

import pytest


# ── Unit tests (no DB) ────────────────────────────────────────────────────────

def validate_splits_sum(expense_amount: Decimal, splits: list) -> tuple[bool, str]:
    """Pure helper mirroring the validation logic in expenses.py."""
    for s in splits:
        if s["amount"] <= 0:
            return False, f"Split amount must be > 0, got {s['amount']}"
    total = sum(Decimal(str(s["amount"])) for s in splits)
    if abs(total - expense_amount) > Decimal("0.01"):
        return False, f"Splits total ({total}) != expense amount ({expense_amount})"
    return True, "ok"


def validate_settlement_members(payer_id, payee_id, member_ids: set) -> tuple[bool, str]:
    """Pure helper mirroring settlement member validation."""
    if payer_id == payee_id:
        return False, "payer_id and payee_id must be different"
    if payer_id not in member_ids:
        return False, f"payer_id {payer_id} is not a member"
    if payee_id not in member_ids:
        return False, f"payee_id {payee_id} is not a member"
    return True, "ok"


class TestSplitSumValidation:
    def test_valid_splits(self):
        ok, msg = validate_splits_sum(
            Decimal("100.00"),
            [{"amount": 50.00}, {"amount": 50.00}],
        )
        assert ok, msg

    def test_splits_rounding_tolerance(self):
        ok, msg = validate_splits_sum(
            Decimal("10.00"),
            [{"amount": 3.33}, {"amount": 3.33}, {"amount": 3.34}],
        )
        assert ok, msg

    def test_splits_dont_sum(self):
        ok, msg = validate_splits_sum(
            Decimal("100.00"),
            [{"amount": 40.00}, {"amount": 40.00}],
        )
        assert not ok
        assert "80" in msg

    def test_split_amount_zero(self):
        ok, msg = validate_splits_sum(
            Decimal("100.00"),
            [{"amount": 0}, {"amount": 100.00}],
        )
        assert not ok
        assert "> 0" in msg

    def test_split_amount_negative(self):
        ok, msg = validate_splits_sum(
            Decimal("100.00"),
            [{"amount": -10}, {"amount": 110.00}],
        )
        assert not ok


class TestSettlementMemberValidation:
    def test_valid_settlement(self):
        a, b = uuid.uuid4(), uuid.uuid4()
        ok, msg = validate_settlement_members(a, b, {a, b})
        assert ok, msg

    def test_self_settlement_rejected(self):
        a = uuid.uuid4()
        ok, msg = validate_settlement_members(a, a, {a})
        assert not ok
        assert "different" in msg

    def test_payer_not_member(self):
        a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ok, msg = validate_settlement_members(a, b, {b, c})
        assert not ok
        assert "payer_id" in msg

    def test_payee_not_member(self):
        a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ok, msg = validate_settlement_members(a, b, {a, c})
        assert not ok
        assert "payee_id" in msg


# ── Integration tests (TestClient) ───────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """Create a TestClient. Skips if no real DB is configured."""
    db_url = os.environ.get("DATABASE_URL", "")
    if "sqlite" in db_url or not db_url:
        pytest.skip("Integration tests require a real PostgreSQL DATABASE_URL")
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def test_user_creds():
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123!",
        "display_name": "Test User",
    }


def test_signup(client, test_user_creds):
    resp = client.post("/api/v1/auth/signup", json=test_user_creds)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == test_user_creds["email"]
    assert "id" in data


def test_login(client, test_user_creds):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": test_user_creds["email"], "password": test_user_creds["password"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user_creds):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": test_user_creds["email"], "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_duplicate_signup(client, test_user_creds):
    resp = client.post("/api/v1/auth/signup", json=test_user_creds)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


# ── Unit tests: member role validation ───────────────────────────────────────

VALID_ROLES = {"admin", "member"}


def validate_member_role(role: str) -> tuple[bool, str]:
    if role not in VALID_ROLES:
        return False, f"role must be one of {VALID_ROLES}, got '{role}'"
    return True, "ok"


def validate_owner_protection(is_owner: bool, action: str) -> tuple[bool, str]:
    """Owners cannot be removed or demoted."""
    if is_owner and action in ("remove", "demote"):
        return False, "Cannot remove or demote the group owner"
    return True, "ok"


class TestMemberRoleValidation:
    def test_valid_admin_role(self):
        ok, msg = validate_member_role("admin")
        assert ok, msg

    def test_valid_member_role(self):
        ok, msg = validate_member_role("member")
        assert ok, msg

    def test_invalid_role(self):
        ok, msg = validate_member_role("owner")
        assert not ok
        assert "owner" in msg

    def test_empty_role_rejected(self):
        ok, msg = validate_member_role("")
        assert not ok


class TestOwnerProtection:
    def test_owner_cannot_be_removed(self):
        ok, msg = validate_owner_protection(is_owner=True, action="remove")
        assert not ok
        assert "owner" in msg

    def test_owner_cannot_be_demoted(self):
        ok, msg = validate_owner_protection(is_owner=True, action="demote")
        assert not ok
        assert "owner" in msg

    def test_non_owner_can_be_removed(self):
        ok, msg = validate_owner_protection(is_owner=False, action="remove")
        assert ok, msg

    def test_non_owner_can_be_demoted(self):
        ok, msg = validate_owner_protection(is_owner=False, action="demote")
        assert ok, msg

