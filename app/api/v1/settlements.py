import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Membership, Settlement, User
from app.schemas.schemas import SettlementCreate, SettlementOut

router = APIRouter(prefix="/groups/{group_id}/settlements", tags=["settlements"])


async def _get_member_ids(db: AsyncSession, group_id: uuid.UUID) -> set:
    result = await db.execute(
        select(Membership.user_id).where(Membership.group_id == group_id)
    )
    return {row[0] for row in result.fetchall()}


@router.post("", response_model=SettlementOut, status_code=201)
async def record_settlement(
    group_id: uuid.UUID,
    body: SettlementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Membership).where(Membership.group_id == group_id, Membership.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        # Return 404 to avoid leaking group existence to non-members
        raise HTTPException(status_code=404, detail="Group not found")

    # Reject self-settlement
    if body.payer_id == body.payee_id:
        raise HTTPException(status_code=400, detail="payer_id and payee_id must be different")

    # Validate both payer and payee are group members
    member_ids = await _get_member_ids(db, group_id)
    if body.payer_id not in member_ids:
        raise HTTPException(status_code=400, detail=f"payer_id {body.payer_id} is not a member of this group")
    if body.payee_id not in member_ids:
        raise HTTPException(status_code=400, detail=f"payee_id {body.payee_id} is not a member of this group")

    settlement = Settlement(
        group_id=group_id,
        payer_id=body.payer_id,
        payee_id=body.payee_id,
        amount=body.amount,
        currency=body.currency,
        note=body.note,
    )
    db.add(settlement)
    await db.commit()
    await db.refresh(settlement)
    return settlement
