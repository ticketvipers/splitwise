import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Group, InviteToken, Membership, User
from app.schemas.schemas import GroupOut, InviteOut, JoinResponse

router = APIRouter(tags=["invites"])

BASE_URL = "https://api.splitwise.app"  # override via env if needed


def _make_join_url(token: str) -> str:
    import os
    base = os.environ.get("BASE_URL", BASE_URL)
    return f"{base}/api/v1/invites/{token}/join"


async def _require_membership(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> Membership:
    result = await db.execute(
        select(Membership).where(
            Membership.group_id == group_id,
            Membership.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return membership


@router.post("/groups/{group_id}/invites", response_model=InviteOut, status_code=201)
async def create_invite(
    group_id: uuid.UUID,
    expires_in_hours: Optional[int] = Query(None, description="Token expiry in hours (optional)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an invite token for a group (members only)."""
    await _require_membership(db, group_id, current_user.id)

    # Verify group exists
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    expires_at = None
    if expires_in_hours:
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)

    token_value = secrets.token_urlsafe(32)
    invite = InviteToken(
        group_id=group_id,
        token=token_value,
        created_by=current_user.id,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    return InviteOut(
        token=invite.token,
        group_id=invite.group_id,
        join_url=_make_join_url(invite.token),
        expires_at=invite.expires_at,
        is_revoked=invite.is_revoked,
    )


@router.post("/invites/{token}/join", response_model=JoinResponse)
async def join_via_token(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a group via invite token."""
    result = await db.execute(select(InviteToken).where(InviteToken.token == token))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    if invite.is_revoked:
        raise HTTPException(status_code=410, detail="Invite token has been revoked")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite token has expired")

    # Check if already a member
    existing = await db.execute(
        select(Membership).where(
            Membership.group_id == invite.group_id,
            Membership.user_id == current_user.id,
        )
    )
    if not existing.scalar_one_or_none():
        membership = Membership(
            user_id=current_user.id,
            group_id=invite.group_id,
            role="member",
        )
        db.add(membership)
        await db.commit()

    group_result = await db.execute(select(Group).where(Group.id == invite.group_id))
    group = group_result.scalar_one()

    return JoinResponse(group=GroupOut.model_validate(group))


@router.delete("/groups/{group_id}/invites/{token}", status_code=204)
async def revoke_invite(
    group_id: uuid.UUID,
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an invite token (admin or token creator only)."""
    membership = await _require_membership(db, group_id, current_user.id)

    result = await db.execute(
        select(InviteToken).where(
            InviteToken.token == token,
            InviteToken.group_id == group_id,
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite token not found")

    if membership.role != "admin" and invite.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only admins or token creators can revoke invites")

    invite.is_revoked = True
    await db.commit()
