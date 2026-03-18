import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Expense, Membership, Split, User
from app.schemas.schemas import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["expenses"])


async def _assert_member(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID):
    result = await db.execute(
        select(Membership).where(Membership.group_id == group_id, Membership.user_id == user_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this group")


async def _get_member_ids(db: AsyncSession, group_id: uuid.UUID) -> set:
    result = await db.execute(
        select(Membership.user_id).where(Membership.group_id == group_id)
    )
    return {row[0] for row in result.fetchall()}


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    group_id: uuid.UUID,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)

    # Validate each split amount > 0
    for s in body.splits:
        if s.amount <= 0:
            raise HTTPException(status_code=422, detail=f"Split amount must be > 0, got {s.amount}")

    # Validate splits sum to expense amount (allow ±0.01 rounding)
    splits_total = sum(s.amount for s in body.splits)
    if abs(splits_total - body.amount) > Decimal("0.01"):
        raise HTTPException(
            status_code=422,
            detail=f"Splits total ({splits_total}) must equal expense amount ({body.amount})"
        )

    # Validate all split user_ids are group members
    member_ids = await _get_member_ids(db, group_id)
    invalid_users = [str(s.user_id) for s in body.splits if s.user_id not in member_ids]
    if invalid_users:
        raise HTTPException(
            status_code=422,
            detail=f"The following user_ids are not members of the group: {', '.join(invalid_users)}"
        )

    expense = Expense(
        group_id=group_id,
        payer_id=current_user.id,
        description=body.description,
        amount=body.amount,
        currency=body.currency,
    )
    db.add(expense)
    await db.flush()
    for s in body.splits:
        db.add(Split(expense_id=expense.id, user_id=s.user_id, amount=s.amount))
    await db.commit()
    result = await db.execute(
        select(Expense).options(selectinload(Expense.splits)).where(Expense.id == expense.id)
    )
    return result.scalar_one()


@router.get("", response_model=list[ExpenseOut])
async def list_expenses(
    group_id: uuid.UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.splits))
        .where(Expense.group_id == group_id)
        .order_by(Expense.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
