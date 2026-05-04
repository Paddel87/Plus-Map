"""Add optional ``event.title`` column (ADR-056, M11-HOTFIX-008).

Adds a nullable VARCHAR(120) column for short event identifiers
(Issue #27 Befund 4+5). Existing rows default to NULL — UI falls back
to the previous start-time/coordinate display when the field is unset.

Revision ID: 20260503_1800_event_title
Revises: 20260501_1200_legacy_ref
Create Date: 2026-05-03 18:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260503_1800_event_title"
down_revision: str | None = "20260501_1200_legacy_ref"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event",
        sa.Column("title", sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event", "title")
