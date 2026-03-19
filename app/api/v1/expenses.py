import json
import uuid
from decimal import Decimal, ROUND_DOWN
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Expense, ExpenseAuditLog, Membership, Split, User
from app.schemas.schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate, PaginatedResponse

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["expenses"])


async def _assert_member(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID):
    result = await db.execute(
        select(Membership).where(Membership.group_id == group_id, Membership.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")


async def _get_member_ids(db: AsyncSession, group_id: uuid.UUID) -> set:
    result = await db.execute(
        select(Membership.user_id).where(Membership.group_id == group_id)
    )
    return {row[0] for row in result.fetchall()}


async def _get_expense_or_404(db: AsyncSession, group_id: uuid.UUID, expense_id: uuid.UUID) -> Expense:
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.splits), selectinload(Expense.audit_logs))
        .where(Expense.id == expense_id, Expense.group_id == group_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


async def _assert_can_modify(db: AsyncSession, group_id: uuid.UUID, expense: Expense, user_id: uuid.UUID):
    """Allow only expense payer or group admin."""
    if expense.payer_id == user_id:
        return
    result = await db.execute(
        select(Membership).where(Membership.group_id == group_id, Membership.user_id == user_id)
    )
    membership = result.scalar_one_or_none()
    if membership and membership.role == "admin":
        return
    raise HTTPException(status_code=403, detail="Not authorized to modify this expense")


def _compute_equal_splits(amount: Decimal, member_ids: list[uuid.UUID]) -> list[tuple[uuid.UUID, Decimal]]:
    """Divide amount equally; absorb rounding into last member."""
    n = len(member_ids)
    base = (amount / n).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    remainder = amount - base * n
    splits = []
    for i, uid in enumerate(member_ids):
        share = base + (Decimal("0.01") if i == n - 1 and remainder > 0 else Decimal("0"))
        splits.append((uid, share))
    return splits


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    group_id: uuid.UUID,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    member_ids = await _get_member_ids(db, group_id)

    if body.split_type == "equal":
        # Auto-divide equally among all group members
        computed_splits = _compute_equal_splits(body.amount, sorted(member_ids))
    else:
        # Exact: caller must supply splits
        if not body.splits:
            raise HTTPException(status_code=422, detail="splits list required for split_type='exact'")

        # Validate each split amount > 0
        for s in body.splits:
            if s.amount <= 0:
                raise HTTPException(status_code=422, detail=f"Split amount must be > 0, got {s.amount}")

        # Validate splits sum to expense amount (allow ±0.01 rounding tolerance)
        splits_total = sum(s.amount for s in body.splits)
        if abs(splits_total - body.amount) > Decimal("0.01"):
            raise HTTPException(
                status_code=422,
                detail=f"Splits total ({splits_total}) must equal expense amount ({body.amount})",
            )

        # Validate all split user_ids are group members
        invalid_users = [str(s.user_id) for s in body.splits if s.user_id not in member_ids]
        if invalid_users:
            raise HTTPException(
                status_code=422,
                detail=f"The following user_ids are not members of the group: {', '.join(invalid_users)}",
            )

        computed_splits = [(s.user_id, s.amount) for s in body.splits]

    payer_id = body.payer_id or current_user.id
    if payer_id not in member_ids:
        raise HTTPException(status_code=422, detail="payer_id must be a member of the group")

    expense = Expense(
        group_id=group_id,
        payer_id=payer_id,
        description=body.description,
        amount=body.amount,
        currency=body.currency,
        notes=body.notes,
        date=body.date,
        split_type=body.split_type,
    )
    db.add(expense)
    await db.flush()

    for uid, amt in computed_splits:
        db.add(Split(expense_id=expense.id, user_id=uid, amount=amt))

    await db.commit()
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.splits), selectinload(Expense.audit_logs))
        .where(Expense.id == expense.id)
    )
    return result.scalar_one()


@router.get("", response_model=PaginatedResponse[ExpenseOut])
async def list_expenses(
    group_id: uuid.UUID,
    response: Response,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    response.headers["X-API-Change"] = "list-endpoints-now-paginated"

    base_query = (
        select(Expense)
        .where(Expense.group_id == group_id)
        .order_by(Expense.created_at.desc())
    )
    count_result = await db.execute(
        select(sqlfunc.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        base_query
        .options(selectinload(Expense.splits), selectinload(Expense.audit_logs))
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + len(items)) < total,
    )


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(
    group_id: uuid.UUID,
    expense_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    return await _get_expense_or_404(db, group_id, expense_id)


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    group_id: uuid.UUID,
    expense_id: uuid.UUID,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    expense = await _get_expense_or_404(db, group_id, expense_id)
    await _assert_can_modify(db, group_id, expense, current_user.id)

    # Snapshot before mutation for audit trail
    snapshot = {
        "description": expense.description,
        "amount": str(expense.amount),
        "currency": expense.currency,
        "notes": expense.notes,
        "date": expense.date.isoformat() if expense.date else None,
    }

    if body.description is not None:
        expense.description = body.description
    if body.currency is not None:
        expense.currency = body.currency
    if body.notes is not None:
        expense.notes = body.notes
    if body.date is not None:
        expense.date = body.date
    if body.amount is not None and body.amount != expense.amount:
        old_amount = Decimal(str(expense.amount))
        new_amount = Decimal(str(body.amount))
        expense.amount = new_amount

        # Recalculate splits proportionally, absorbing rounding into last split
        splits = expense.splits
        if splits and old_amount:
            scaled = [
                (Decimal(str(s.amount)) / old_amount * new_amount).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
                for s in splits
            ]
            remainder = new_amount - sum(scaled)
            scaled[-1] += remainder
            for split, new_split_amount in zip(splits, scaled):
                split.amount = new_split_amount

    # Record audit log
    db.add(ExpenseAuditLog(
        expense_id=expense.id,
        actor_id=current_user.id,
        action="edit",
        audit_note=body.audit_note,
        snapshot=json.dumps(snapshot),
    ))

    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    group_id: uuid.UUID,
    expense_id: uuid.UUID,
    audit_note: str = Query(default=None, description="Reason for deletion"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    expense = await _get_expense_or_404(db, group_id, expense_id)
    await _assert_can_modify(db, group_id, expense, current_user.id)

    # Snapshot before delete
    snapshot = {
        "description": expense.description,
        "amount": str(expense.amount),
        "currency": expense.currency,
        "notes": expense.notes,
        "payer_id": str(expense.payer_id),
    }

    # Write audit log before delete (expense_audit_logs will cascade-delete — so we detach first)
    # We detach the log from the expense relationship to survive the expense deletion
    audit_log = ExpenseAuditLog(
        expense_id=expense.id,
        actor_id=current_user.id,
        action="delete",
        audit_note=audit_note,
        snapshot=json.dumps(snapshot),
    )
    db.add(audit_log)
    await db.flush()  # write audit log before cascade delete

    await db.delete(expense)
    await db.commit()
