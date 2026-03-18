"""add updated_at to expenses

Revision ID: 0005_expense_updated_at
Revises: 0004_invite_tokens
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_expense_updated_at"
down_revision = "0004_invite_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("expenses", "updated_at")
