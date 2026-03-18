import uuid
from fastapi import APIRouter, Depends, HTTPException
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


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    group_id: uuid.UUID,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_member(db, group_id, current_user.id)
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.splits))
        .where(Expense.group_id == group_id)
        .order_by(Expense.created_at.desc())
    )
    return result.scalars().all()
