"""M5c.1b sync columns and surrogate PK on event_participant.

Macht ``event_participant`` sync-fähig (RxDB verlangt einen einzigen
String-PK, siehe ADR-037 §A):

- Neue Surrogate-Spalte ``id uuid`` als Primärschlüssel.
- Composite-PK ``(event_id, person_id)`` wandert nach UNIQUE-Constraint,
  damit die Eindeutigkeit erhalten bleibt.
- ``updated_at NOT NULL DEFAULT clock_timestamp()`` mit Backfill aus
  ``created_at`` (analog ADR-030 §B).
- ``is_deleted`` / ``deleted_at`` für Tombstone-Replikation.
- Cursor-Index ``(updated_at, id)`` für ``GET
  /api/sync/event-participants/pull``.
- ``set_updated_at_event_participant``-Trigger (analog Initial-Schema).
- ``cascade_event_soft_delete()`` wird so erweitert, dass beim Soft-
  Delete eines Events auch die nicht-gelöschten event_participant-Rows
  desselben Events auf ``is_deleted = true`` gesetzt werden (ADR-037 §C).

Revision ID: 20260427_1900_m5c1b_ep_sync
Revises: 20260426_1830_m5b2_owner_select
Create Date: 2026-04-27 19:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260427_1900_m5c1b_ep_sync"
down_revision: str | None = "20260426_1830_m5b2_owner_select"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Surrogate id column.
    #    Add nullable with a server-side default so existing rows get a
    #    UUID retroactively *and* future raw SQL inserts (test fixtures,
    #    SQLAdmin, ad-hoc psql) don't need to supply id manually.
    #    pgcrypto ships gen_random_uuid; postgis pulls it in on most
    #    builds, but the explicit CREATE EXTENSION makes the migration
    #    self-contained.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.add_column(
        "event_participant",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
    )
    op.execute("UPDATE event_participant SET id = gen_random_uuid() WHERE id IS NULL")
    op.alter_column("event_participant", "id", nullable=False)

    # 2. Drop the composite PK and promote (event_id, person_id) to UNIQUE.
    op.execute("ALTER TABLE event_participant DROP CONSTRAINT pk_event_participant")
    op.create_primary_key("pk_event_participant", "event_participant", ["id"])
    op.create_unique_constraint(
        "uq_event_participant_event_id_person_id",
        "event_participant",
        ["event_id", "person_id"],
    )

    # 3. updated_at: add nullable, backfill, then default + NOT NULL.
    op.add_column(
        "event_participant",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE event_participant SET updated_at = created_at WHERE updated_at IS NULL")
    op.execute(
        "ALTER TABLE event_participant ALTER COLUMN updated_at SET DEFAULT clock_timestamp()"
    )
    op.execute("ALTER TABLE event_participant ALTER COLUMN updated_at SET NOT NULL")

    # 4. Soft-delete columns.
    op.add_column(
        "event_participant",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "event_participant",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 5. Cursor index for /api/sync/event-participants/pull.
    op.create_index(
        "ix_event_participant_cursor",
        "event_participant",
        ["updated_at", "id"],
    )

    # 6. set_updated_at trigger — same shared function as the other
    #    sync-aware tables (created in the initial migration).
    op.execute(
        "CREATE TRIGGER set_updated_at_event_participant "
        'BEFORE UPDATE ON "event_participant" '
        "FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
    )

    # 7. Extend cascade_event_soft_delete() so a soft-deleted event also
    #    tombstones its event_participant rows (ADR-037 §C). The earlier
    #    M5b.1 version handled only `application`.
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
                UPDATE event_participant
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


def downgrade() -> None:
    # Reverse order: revert cascade extension, drop trigger, drop index,
    # drop columns, restore composite PK.
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

    op.execute('DROP TRIGGER IF EXISTS set_updated_at_event_participant ON "event_participant"')
    op.drop_index("ix_event_participant_cursor", table_name="event_participant")

    op.drop_column("event_participant", "deleted_at")
    op.drop_column("event_participant", "is_deleted")
    op.drop_column("event_participant", "updated_at")

    # Reinstate composite PK. Drop the unique constraint first because
    # otherwise postgres will keep an implicit index that conflicts
    # with the PK.
    op.drop_constraint(
        "uq_event_participant_event_id_person_id",
        "event_participant",
        type_="unique",
    )
    op.execute("ALTER TABLE event_participant DROP CONSTRAINT pk_event_participant")
    op.execute(
        "ALTER TABLE event_participant ADD CONSTRAINT pk_event_participant "
        "PRIMARY KEY (event_id, person_id)"
    )
    op.drop_column("event_participant", "id")
