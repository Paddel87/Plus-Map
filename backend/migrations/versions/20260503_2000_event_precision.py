"""Add ``event.time_precision`` marker (ADR-058, M11-HOTFIX-010).

Adds a NOT NULL ``time_precision`` column with default ``'minute'`` and
a CHECK constraint restricting the value to one of five granularity
markers: year/month/day/hour/minute. Existing rows automatically get
``'minute'`` (backwards-compatible — matches the previous behaviour).

Revision ID: 20260503_2000_event_precision
Revises: 20260503_1800_event_title
Create Date: 2026-05-03 20:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260503_2000_event_precision"
down_revision: str | None = "20260503_1800_event_title"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event",
        sa.Column(
            "time_precision",
            sa.String(length=10),
            nullable=False,
            server_default="minute",
        ),
    )
    op.create_check_constraint(
        "event_time_precision_check",
        "event",
        "time_precision IN ('year', 'month', 'day', 'hour', 'minute')",
    )


def downgrade() -> None:
    op.drop_constraint("event_time_precision_check", "event", type_="check")
    op.drop_column("event", "time_precision")
