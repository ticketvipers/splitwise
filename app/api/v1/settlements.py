import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Membership, Settlement, User
from app.schemas.schemas import SettlementCreate, SettlementOut

router = APIRouter(prefix="/groups/{group_id}/settlements", tags=["settlements"])


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
        raise HTTPException(status_code=403, detail="Not a member of this group")

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
