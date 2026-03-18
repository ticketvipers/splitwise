"""Unit tests for compute_balances() pure function."""
from decimal import Decimal
from types import SimpleNamespace
import pytest

from app.services.balance_service import compute_balances


def make_expense(payer_id: str, amount: str, splits: list[tuple[str, str]]):
    split_objs = [SimpleNamespace(user_id=uid, amount=Decimal(a)) for uid, a in splits]
    return SimpleNamespace(payer_id=payer_id, amount=Decimal(amount), splits=split_objs)


def make_settlement(payer_id: str, payee_id: str, amount: str):
    return SimpleNamespace(payer_id=payer_id, payee_id=payee_id, amount=Decimal(amount))


def test_two_users_one_expense():
    """A pays $10, split equally → B owes A $5."""
    a, b = "user-a", "user-b"
    expense = make_expense(a, "10.00", [(a, "5.00"), (b, "5.00")])
    result = compute_balances([expense], [], [a, b])
    assert len(result) == 1
    assert result[0]["from_user_id"] == b
    assert result[0]["to_user_id"] == a
    assert result[0]["amount"] == Decimal("5.00")


def test_three_users_one_payer():
    """A pays $30, split equally → B owes A $10, C owes A $10."""
    a, b, c = "user-a", "user-b", "user-c"
    expense = make_expense(a, "30.00", [(a, "10.00"), (b, "10.00"), (c, "10.00")])
    result = compute_balances([expense], [], [a, b, c])
    assert len(result) == 2
    debts = {r["from_user_id"]: r["amount"] for r in result}
    assert debts[b] == Decimal("10.00")
    assert debts[c] == Decimal("10.00")
    for r in result:
        assert r["to_user_id"] == a


def test_multiple_payers_simplified():
    """A pays $20, B pays $10, split 3 ways ($10 each) → simplified debt."""
    a, b, c = "user-a", "user-b", "user-c"
    # A pays $20, each owes $10: A net +$10, B net $0, C net -$10
    # B pays $10, each owes $10: B net +$0 (was 0, now pays +$10, owes $10), C gets more debt
    # expense1: A pays $20, splits: A=$10, B=$5, C=$5 → net: A+10, B-5, C-5 from this expense... let's be explicit
    # Simplest: A pays $20 split equally among A,B,C → each $6.67 (messy). Do clean:
    # A pays $21, splits (A=$7, B=$7, C=$7): A net +14, B net -7, C net -7
    # B pays $12, splits (A=$4, B=$4, C=$4): A net +10, B net +4, C net -11
    # After both: A net=14-4=+10? Let me just use compute and check simplification
    expense1 = make_expense(a, "20.00", [(a, "10.00"), (b, "5.00"), (c, "5.00")])
    expense2 = make_expense(b, "10.00", [(a, "5.00"), (b, "5.00"), (c, "0.00")])
    # net: A = +20 - 10 - 5 = +5, B = +10 - 5 - 5 = 0, C = 0 - 5 - 0 = -5
    result = compute_balances([expense1, expense2], [], [a, b, c])
    assert len(result) == 1
    assert result[0]["from_user_id"] == c
    assert result[0]["to_user_id"] == a
    assert result[0]["amount"] == Decimal("5.00")


def test_settlement_zeros_balance():
    """After settlement, balances update to zero."""
    a, b = "user-a", "user-b"
    expense = make_expense(a, "10.00", [(a, "5.00"), (b, "5.00")])
    settlement = make_settlement(b, a, "5.00")
    result = compute_balances([expense], [settlement], [a, b])
    assert result == []


def test_all_equal_no_balances():
    """When everyone pays equally, no balances returned."""
    a, b = "user-a", "user-b"
    # Each pays $10 for the other: A pays B's $10, B pays A's $10
    e1 = make_expense(a, "10.00", [(a, "5.00"), (b, "5.00")])
    e2 = make_expense(b, "10.00", [(a, "5.00"), (b, "5.00")])
    result = compute_balances([e1, e2], [], [a, b])
    assert result == []
