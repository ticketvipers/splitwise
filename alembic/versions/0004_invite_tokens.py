"""add invite_tokens table

Revision ID: 0004_invite_tokens
Revises: 0003_google_oauth
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_invite_tokens"
down_revision = "0003_google_oauth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invite_tokens",
        sa.Column("id", sa.Uuid(as_uuid=True, native_uuid=False), primary_key=True),
        sa.Column("group_id", sa.Uuid(as_uuid=True, native_uuid=False), sa.ForeignKey("groups.id"), nullable=False),
        sa.Column("token", sa.String(64), unique=True, nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True, native_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), default=False, nullable=False, server_default="false"),
    )
    op.create_index("ix_invite_tokens_token", "invite_tokens", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_invite_tokens_token", table_name="invite_tokens")
    op.drop_table("invite_tokens")
