"""Rename event.w3w_legacy to event.legacy_external_ref (ADR-050).

M9 (w3w-Migration) is dropped (see ADR-050, 2026-05-01); the column
is repurposed as a generic optional legacy reference for events
backfilled from external sources. Type and nullability are unchanged
(text NULL); no data migration is needed because the column has only
ever held NULL values (M9 never ran).

Revision ID: 20260501_1200_legacy_ref
Revises: 20260428_1200_m7_1_catalog
Create Date: 2026-05-01 12:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260501_1200_legacy_ref"
down_revision: str | None = "20260428_1200_m7_1_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "event",
        "w3w_legacy",
        new_column_name="legacy_external_ref",
    )


def downgrade() -> None:
    op.alter_column(
        "event",
        "legacy_external_ref",
        new_column_name="w3w_legacy",
    )
