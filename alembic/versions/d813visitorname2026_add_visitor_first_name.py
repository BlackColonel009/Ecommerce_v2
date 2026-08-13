"""add optional visitor first name for WhatsApp requests

Revision ID: d813visitorname2026
Revises: b109blog2026
Create Date: 2026-08-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d813visitorname2026"
down_revision: Union[str, Sequence[str], None] = "b109blog2026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("visitors", sa.Column("first_name", sa.String(length=80), nullable=True))
    op.add_column("visitors", sa.Column("first_name_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("visitors", "first_name_updated_at")
    op.drop_column("visitors", "first_name")
