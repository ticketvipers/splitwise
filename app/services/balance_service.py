import uuid
from decimal import Decimal


def compute_balances(
    expenses: list, settlements: list, member_ids: list[str]
) -> tuple[list[dict], dict]:
    """
    Returns a tuple of:
      - simplified debts: list of {from_user_id, to_user_id, amount}
      - net map: {user_id_str: Decimal}
    Uses greedy debt simplification algorithm.
    Handles former members (users in splits/settlements but not in member_ids).
    """
    net = {mid: Decimal("0") for mid in member_ids}

    for expense in expenses:
        net.setdefault(str(expense.payer_id), Decimal("0"))
        net[str(expense.payer_id)] += expense.amount
        for split in expense.splits:
            net.setdefault(str(split.user_id), Decimal("0"))
            net[str(split.user_id)] -= split.amount

    for settlement in settlements:
        net.setdefault(str(settlement.payer_id), Decimal("0"))
        net.setdefault(str(settlement.payee_id), Decimal("0"))
        net[str(settlement.payer_id)] += settlement.amount
        net[str(settlement.payee_id)] -= settlement.amount

    # Greedy simplification
    creditors = sorted(
        [(uid, amt) for uid, amt in net.items() if amt > Decimal("0.005")],
        key=lambda x: -x[1],
    )
    debtors = sorted(
        [(uid, -amt) for uid, amt in net.items() if amt < Decimal("-0.005")],
        key=lambda x: -x[1],
    )

    result = []
    ci, di = 0, 0
    while ci < len(creditors) and di < len(debtors):
        cid, camt = creditors[ci]
        did, damt = debtors[di]
        amount = min(camt, damt)
        result.append(
            {
                "from_user_id": uuid.UUID(did),
                "to_user_id": uuid.UUID(cid),
                "amount": round(amount, 2),
            }
        )
        creditors[ci] = (cid, camt - amount)
        debtors[di] = (did, damt - amount)
        if creditors[ci][1] < Decimal("0.005"):
            ci += 1
        if debtors[di][1] < Decimal("0.005"):
            di += 1

    return result, net
