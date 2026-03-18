"""add google_id to users and make hashed_password nullable

Revision ID: 0003_google_oauth
Revises: 0002_fk_indexes_and_triggers
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_google_oauth"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_id column (nullable, unique)
    op.add_column("users", sa.Column("google_id", sa.String(255), nullable=True))
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    # Make hashed_password nullable (Google-only users won't have a password)
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.drop_index("ix_users_google_id", "users")
    op.drop_column("users", "google_id")
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=False)
