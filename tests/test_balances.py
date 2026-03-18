"""Unit tests for compute_balances() pure function."""
from decimal import Decimal
from types import SimpleNamespace
import uuid
import pytest

from app.services.balance_service import compute_balances

# Stable UUIDs for tests
A = "00000000-0000-0000-0000-000000000001"
B = "00000000-0000-0000-0000-000000000002"
C = "00000000-0000-0000-0000-000000000003"
X = "00000000-0000-0000-0000-000000000099"  # former member


def make_expense(payer_id: str, amount: str, splits: list[tuple[str, str]]):
    split_objs = [SimpleNamespace(user_id=uid, amount=Decimal(a)) for uid, a in splits]
    return SimpleNamespace(payer_id=payer_id, amount=Decimal(amount), splits=split_objs)


def make_settlement(payer_id: str, payee_id: str, amount: str):
    return SimpleNamespace(payer_id=payer_id, payee_id=payee_id, amount=Decimal(amount))


def test_two_users_one_expense():
    """A pays $10, split equally → B owes A $5."""
    expense = make_expense(A, "10.00", [(A, "5.00"), (B, "5.00")])
    result, net = compute_balances([expense], [], [A, B])
    assert len(result) == 1
    assert result[0]["from_user_id"] == uuid.UUID(B)
    assert result[0]["to_user_id"] == uuid.UUID(A)
    assert result[0]["amount"] == Decimal("5.00")


def test_three_users_one_payer():
    """A pays $30, split equally → B owes A $10, C owes A $10."""
    expense = make_expense(A, "30.00", [(A, "10.00"), (B, "10.00"), (C, "10.00")])
    result, net = compute_balances([expense], [], [A, B, C])
    assert len(result) == 2
    debts = {str(r["from_user_id"]): r["amount"] for r in result}
    assert debts[B] == Decimal("10.00")
    assert debts[C] == Decimal("10.00")
    for r in result:
        assert r["to_user_id"] == uuid.UUID(A)


def test_multiple_payers_simplified():
    """A pays $20, B pays $10, split 3 ways → simplified debt."""
    expense1 = make_expense(A, "20.00", [(A, "10.00"), (B, "5.00"), (C, "5.00")])
    expense2 = make_expense(B, "10.00", [(A, "5.00"), (B, "5.00"), (C, "0.00")])
    # net: A = +20 - 10 - 5 = +5, B = +10 - 5 - 5 = 0, C = 0 - 5 - 0 = -5
    result, net = compute_balances([expense1, expense2], [], [A, B, C])
    assert len(result) == 1
    assert result[0]["from_user_id"] == uuid.UUID(C)
    assert result[0]["to_user_id"] == uuid.UUID(A)
    assert result[0]["amount"] == Decimal("5.00")


def test_settlement_zeros_balance():
    """After settlement, balances update to zero."""
    expense = make_expense(A, "10.00", [(A, "5.00"), (B, "5.00")])
    settlement = make_settlement(B, A, "5.00")
    result, net = compute_balances([expense], [settlement], [A, B])
    assert result == []


def test_all_equal_no_balances():
    """When everyone pays equally, no balances returned."""
    e1 = make_expense(A, "10.00", [(A, "5.00"), (B, "5.00")])
    e2 = make_expense(B, "10.00", [(A, "5.00"), (B, "5.00")])
    result, net = compute_balances([e1, e2], [], [A, B])
    assert result == []


def test_single_user_group_empty_balances():
    """Single-user group with no splits → empty balances."""
    result, net = compute_balances([], [], [A])
    assert result == []
    assert net[A] == Decimal("0")


def test_former_member_split_does_not_crash():
    """User X is in splits but not in member_ids → should not raise KeyError."""
    expense = make_expense(A, "10.00", [(A, "5.00"), (X, "5.00")])
    result, net = compute_balances([expense], [], [A, B])
    # Should not crash; X appears in net with negative balance
    assert X in net
    assert net[X] == Decimal("-5.00")


def test_rounding_three_way_split():
    """$10 ÷ 3 split 3 ways — total owed should sum to roughly $10."""
    # $3.33 + $3.33 + $3.34 = $10.00
    expense = make_expense(A, "10.00", [(A, "3.34"), (B, "3.33"), (C, "3.33")])
    result, net = compute_balances([expense], [], [A, B, C])
    total_debt = sum(r["amount"] for r in result)
    # A net = 10 - 3.34 = 6.66; B net = -3.33; C net = -3.33
    assert total_debt == Decimal("6.66")
    # Verify net sums close to zero
    net_sum = sum(net.values())
    assert abs(net_sum) < Decimal("0.01")


def test_partial_settlement_reduces_balance():
    """Partial settlement reduces but doesn't eliminate the debt."""
    expense = make_expense(A, "10.00", [(A, "5.00"), (B, "5.00")])
    settlement = make_settlement(B, A, "3.00")
    result, net = compute_balances([expense], [settlement], [A, B])
    assert len(result) == 1
    assert result[0]["from_user_id"] == uuid.UUID(B)
    assert result[0]["to_user_id"] == uuid.UUID(A)
    assert result[0]["amount"] == Decimal("2.00")


def test_overpayment_flips_direction():
    """If B overpays the settlement, B becomes a creditor."""
    expense = make_expense(A, "10.00", [(A, "5.00"), (B, "5.00")])
    settlement = make_settlement(B, A, "8.00")
    result, net = compute_balances([expense], [settlement], [A, B])
    # B net = -5 + 8 = +3, A net = +5 - 8 = -3
    assert len(result) == 1
    assert result[0]["from_user_id"] == uuid.UUID(A)
    assert result[0]["to_user_id"] == uuid.UUID(B)
    assert result[0]["amount"] == Decimal("3.00")
