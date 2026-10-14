"""create software catalog

Revision ID: e104software2026
Revises: d813visitorname2026
Create Date: 2026-10-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e104software2026"
down_revision: Union[str, Sequence[str], None] = "d813visitorname2026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "software",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("badge", sa.String(length=60), nullable=False),
        sa.Column("short_description", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("features", sa.Text(), nullable=True),
        sa.Column("platforms", sa.String(length=255), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("image_alt", sa.String(length=255), nullable=True),
        sa.Column("discover_url", sa.String(length=500), nullable=True),
        sa.Column("trial_url", sa.String(length=500), nullable=True),
        sa.Column("download_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_software_slug", "software", ["slug"], unique=True)
    op.create_index("ix_software_status", "software", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_software_status", table_name="software")
    op.drop_index("ix_software_slug", table_name="software")
    op.drop_table("software")
