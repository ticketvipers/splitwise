"""Add FK indexes, updated_at trigger, and is_settled note

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- FK indexes ---
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_index("ix_memberships_group_id", "memberships", ["group_id"])
    op.create_index("ix_expenses_group_id", "expenses", ["group_id"])
    op.create_index("ix_expenses_payer_id", "expenses", ["payer_id"])
    op.create_index("ix_splits_expense_id", "splits", ["expense_id"])
    op.create_index("ix_splits_user_id", "splits", ["user_id"])
    op.create_index("ix_settlements_group_id", "settlements", ["group_id"])
    op.create_index("ix_settlements_payer_id", "settlements", ["payer_id"])
    op.create_index("ix_settlements_payee_id", "settlements", ["payee_id"])

    # --- PostgreSQL trigger to auto-update groups.updated_at ---
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    op.execute("""
        CREATE TRIGGER update_groups_updated_at
        BEFORE UPDATE ON groups
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column;")

    op.drop_index("ix_settlements_payee_id", "settlements")
    op.drop_index("ix_settlements_payer_id", "settlements")
    op.drop_index("ix_settlements_group_id", "settlements")
    op.drop_index("ix_splits_user_id", "splits")
    op.drop_index("ix_splits_expense_id", "splits")
    op.drop_index("ix_expenses_payer_id", "expenses")
    op.drop_index("ix_expenses_group_id", "expenses")
    op.drop_index("ix_memberships_group_id", "memberships")
    op.drop_index("ix_memberships_user_id", "memberships")
