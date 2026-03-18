import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Expense, Group, Membership, Settlement, User
from app.schemas.schemas import GroupCreate, GroupUpdate, GroupOut, GroupBalances, BalanceEntry
from app.services.balance_service import compute_balances

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = Group(name=body.name, description=body.description, created_by=current_user.id)
    db.add(group)
    await db.flush()
    membership = Membership(user_id=current_user.id, group_id=group.id, role="admin")
    db.add(membership)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("", response_model=list[GroupOut])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Group)
        .join(Membership, Membership.group_id == Group.id)
        .where(Membership.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{group_id}", response_model=GroupOut)
async def get_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = await _get_group_or_404(db, group_id, current_user.id)
    return group


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: uuid.UUID,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # First check membership (returns 404 for non-members, don't leak existence)
    group = await _get_group_or_404(db, group_id, current_user.id)
    # Then check admin/owner role
    result = await db.execute(
        select(Membership).where(
            Membership.group_id == group_id,
            Membership.user_id == current_user.id,
            Membership.role == "admin",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only group admins can update group details")
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/{group_id}/balances", response_model=GroupBalances)
async def get_group_balances(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_group_or_404(db, group_id, current_user.id)

    # Load all members
    members_result = await db.execute(
        select(Membership).where(Membership.group_id == group_id)
    )
    member_ids = [str(m.user_id) for m in members_result.scalars().all()]

    # Load expenses with splits
    expenses_result = await db.execute(
        select(Expense)
        .where(Expense.group_id == group_id)
        .options(selectinload(Expense.splits))
    )
    expenses = expenses_result.scalars().all()

    # Load settlements
    settlements_result = await db.execute(
        select(Settlement).where(Settlement.group_id == group_id)
    )
    settlements = settlements_result.scalars().all()

    raw_balances = compute_balances(expenses, settlements, member_ids)

    # Compute net amounts
    from decimal import Decimal
    net: dict[str, Decimal] = {mid: Decimal("0") for mid in member_ids}
    for expense in expenses:
        net[str(expense.payer_id)] += expense.amount
        for split in expense.splits:
            net[str(split.user_id)] -= split.amount
    for settlement in settlements:
        net[str(settlement.payer_id)] += settlement.amount
        net[str(settlement.payee_id)] -= settlement.amount

    balance_entries = [
        BalanceEntry(
            from_user_id=b["from_user_id"],
            to_user_id=b["to_user_id"],
            amount=b["amount"],
        )
        for b in raw_balances
    ]

    return GroupBalances(group_id=group_id, balances=balance_entries, net=net)


async def _get_group_or_404(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> Group:
    result = await db.execute(
        select(Group)
        .join(Membership, Membership.group_id == Group.id)
        .where(Group.id == group_id, Membership.user_id == user_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group
