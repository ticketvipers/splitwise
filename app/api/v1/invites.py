import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import Group, InviteToken, Membership, User
from app.schemas.schemas import GroupOut, InviteOut, InvitePreview, JoinResponse

router = APIRouter(tags=["invites"])

BASE_URL = "https://api.splitwise.app"


def _make_join_url(token: str) -> str:
    base = os.environ.get("BASE_URL", BASE_URL)
    return f"{base}/groups/join/{token}"


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


# ── Sprint spec endpoints ──────────────────────────────────────────────────────

@router.post("/groups/{group_id}/invite", response_model=InviteOut, status_code=201)
async def create_invite_sprint(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a reusable invite token for a group (members only). Expires in 7 days."""
    await _require_membership(db, group_id, current_user.id)

    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
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


@router.get("/groups/join/{token}", response_model=InvitePreview)
async def preview_join(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint. Returns group preview for a valid invite token."""
    result = await db.execute(select(InviteToken).where(InviteToken.token == token))
    invite = result.scalar_one_or_none()

    if not invite or invite.is_revoked:
        raise HTTPException(status_code=404, detail="Invalid or inactive invite token")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Invite token has expired")

    group_result = await db.execute(select(Group).where(Group.id == invite.group_id))
    group = group_result.scalar_one()

    member_count_result = await db.execute(
        select(func.count()).select_from(Membership).where(Membership.group_id == group.id)
    )
    member_count = member_count_result.scalar_one()

    return InvitePreview(
        group_id=group.id,
        group_name=group.name,
        member_count=member_count,
        expires_at=invite.expires_at,
    )


@router.post("/groups/join/{token}", response_model=JoinResponse)
async def join_via_token_sprint(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a group via invite token. Auth required."""
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
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a member of this group")

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


# ── Legacy endpoints (kept for backwards compat) ───────────────────────────────

@router.post("/groups/{group_id}/invites", response_model=InviteOut, status_code=201)
async def create_invite(
    group_id: uuid.UUID,
    expires_in_hours: Optional[int] = Query(None, description="Token expiry in hours (optional)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an invite token for a group (members only)."""
    await _require_membership(db, group_id, current_user.id)

    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    expires_at = None
    if expires_in_hours:
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
async def join_via_token_legacy(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a group via invite token (legacy path)."""
    result = await db.execute(select(InviteToken).where(InviteToken.token == token))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    if invite.is_revoked:
        raise HTTPException(status_code=410, detail="Invite token has been revoked")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite token has expired")

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
