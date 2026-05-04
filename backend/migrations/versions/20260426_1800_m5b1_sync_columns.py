"""M5b.1 sync columns: updated_at NOT NULL, soft-delete, cursor index, cascade trigger.

Hebt ``updated_at`` auf ``event`` und ``application`` auf ``NOT NULL``
(Backfill mit ``created_at``), ergänzt ``is_deleted`` / ``deleted_at``,
legt Cursor-Indices ``(updated_at, id)`` an und installiert einen
Cascade-Trigger, der beim Soft-Delete eines Events alle nicht-gelöschten
Child-Applications mitnimmt (siehe ADR-029, ADR-030).

RLS-Policies werden bewusst nicht angefasst — der M5b.1-Scope endet am
Datenmodell. Soft-Delete-bewusste Service-Layer-Filterung folgt in M5b.2
zusammen mit den Sync-Endpoints.

Revision ID: 20260426_1800_m5b1_sync_columns
Revises: 20260425_1730_strict_rls
Create Date: 2026-04-26 18:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260426_1800_m5b1_sync_columns"
down_revision: str | None = "20260425_1730_strict_rls"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_SYNC_TABLES = ("event", "application")


def upgrade() -> None:
    # 1. updated_at: backfill, default, NOT NULL.
    #    set_updated_at-Trigger aus M1 würde den Backfill sofort wieder
    #    überschreiben — daher temporär deaktivieren.
    for tbl in _SYNC_TABLES:
        op.execute(f'ALTER TABLE "{tbl}" DISABLE TRIGGER set_updated_at_{tbl}')
        op.execute(f'UPDATE "{tbl}" SET updated_at = COALESCE(updated_at, created_at)')
        op.execute(f'ALTER TABLE "{tbl}" ENABLE TRIGGER set_updated_at_{tbl}')
        op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN updated_at SET DEFAULT clock_timestamp()')
        op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN updated_at SET NOT NULL')

    # 2. Soft-delete columns. Defaulted false, so existing rows stay visible.
    for tbl in _SYNC_TABLES:
        op.add_column(
            tbl,
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
        op.add_column(
            tbl,
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )

    # 3. Cursor indices for /api/sync/pull pagination (updated_at, id).
    op.create_index("ix_event_cursor", "event", ["updated_at", "id"])
    op.create_index("ix_application_cursor", "application", ["updated_at", "id"])

    # 4. Cascade trigger: soft-deleting an event soft-deletes all non-deleted
    #    child applications. Restore (true → false) intentionally does NOT
    #    cascade — restore is an explicit per-application admin action.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION cascade_event_soft_delete() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
                UPDATE application
                SET is_deleted = true,
                    deleted_at = COALESCE(NEW.deleted_at, clock_timestamp())
                WHERE event_id = NEW.id
                  AND is_deleted = false;
            END IF;
            RETURN NEW;
        END;
        $$;
        """
    )
    op.execute(
        """
        CREATE TRIGGER cascade_event_soft_delete
        AFTER UPDATE OF is_deleted ON "event"
        FOR EACH ROW
        EXECUTE FUNCTION cascade_event_soft_delete()
        """
    )


def downgrade() -> None:
    # Reverse order: trigger → indices → columns → updated_at.
    op.execute('DROP TRIGGER IF EXISTS cascade_event_soft_delete ON "event"')
    op.execute("DROP FUNCTION IF EXISTS cascade_event_soft_delete()")

    op.drop_index("ix_application_cursor", table_name="application")
    op.drop_index("ix_event_cursor", table_name="event")

    op.drop_column("application", "deleted_at")
    op.drop_column("application", "is_deleted")
    op.drop_column("event", "deleted_at")
    op.drop_column("event", "is_deleted")

    for tbl in _SYNC_TABLES:
        op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN updated_at DROP NOT NULL')
        op.execute(f'ALTER TABLE "{tbl}" ALTER COLUMN updated_at DROP DEFAULT')
