import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Group, Membership, User
from app.schemas.schemas import GroupCreate, GroupUpdate, GroupOut

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
    group = await _get_group_or_404(db, group_id, current_user.id)
    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description
    await db.commit()
    await db.refresh(group)
    return group


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
