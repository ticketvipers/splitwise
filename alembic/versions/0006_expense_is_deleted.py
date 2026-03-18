"""add is_deleted to expenses

Revision ID: 0006_expense_is_deleted
Revises: 0005_expense_updated_at
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_expense_is_deleted"
down_revision = "0005_expense_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_expenses_is_deleted", "expenses", ["is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_expenses_is_deleted", table_name="expenses")
    op.drop_column("expenses", "is_deleted")
