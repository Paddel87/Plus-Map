"""Initial HC-Map schema (M1).

Creates the PostGIS extension, the ``app_user`` role, all 10 base tables,
their indices, an ``updated_at`` trigger, and a permissive RLS default
policy on the data-bearing tables (per ADR-018, decision D1). The strict
per-role RLS policies from ``architecture.md`` §RLS are applied in M2.

Revision ID: 20260425_1700_initial
Revises:
Create Date: 2026-04-25 17:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "20260425_1700_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Tables that carry RLS in M1 (data-bearing). Catalog tables get strict
# per-role policies in M2 alongside fastapi-users.
_RLS_TABLES = (
    "event",
    "event_participant",
    "application",
    "application_restraint",
)

# Tables that get the updated_at trigger.
_UPDATED_AT_TABLES = (
    "user",
    "person",
    "event",
    "application",
    "restraint_type",
    "arm_position",
    "hand_position",
    "hand_orientation",
)


def upgrade() -> None:
    # -- Extensions ---------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # -- Application role (NOLOGIN; backend SET ROLEs to it per session) ----
    # IF NOT EXISTS is not part of CREATE ROLE; do a guarded DO block.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
                CREATE ROLE app_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
            END IF;
        END
        $$;
        """
    )

    # -- updated_at trigger function (one shared function) -----------------
    # clock_timestamp() returns wall-clock time so multi-statement
    # transactions still see distinct created_at vs updated_at.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = clock_timestamp();
            RETURN NEW;
        END;
        $$;
        """
    )

    # -- Enums --------------------------------------------------------------
    user_role = sa.Enum("admin", "editor", "viewer", name="user_role")
    person_origin = sa.Enum("managed", "on_the_fly", name="person_origin")
    catalog_status = sa.Enum("approved", "pending", name="catalog_status")
    restraint_category = sa.Enum(
        "handcuffs",
        "thumbcuffs",
        "legcuffs",
        "cuffs_leather",
        "rope",
        "tape",
        "cable_tie",
        "cloth",
        "strap",
        "other",
        name="restraint_category",
    )
    restraint_mech = sa.Enum("chain", "hinged", "rigid", name="restraint_mechanical_type")
    user_role.create(op.get_bind(), checkfirst=True)
    person_origin.create(op.get_bind(), checkfirst=True)
    catalog_status.create(op.get_bind(), checkfirst=True)
    restraint_category.create(op.get_bind(), checkfirst=True)
    restraint_mech.create(op.get_bind(), checkfirst=True)

    # -- person -------------------------------------------------------------
    op.create_table(
        "person",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("alias", sa.String(200), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "origin",
            sa.dialects.postgresql.ENUM(name="person_origin", create_type=False),
            nullable=False,
            server_default="managed",
        ),
        sa.Column(
            "linkable",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        # created_by FK is added later (after user table exists), via ALTER.
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_person_name", "person", ["name"])
    op.create_index("ix_person_origin", "person", ["origin"])
    op.create_index("ix_person_linkable", "person", ["linkable"])
    op.create_index("ix_person_is_deleted", "person", ["is_deleted"])

    # -- user ---------------------------------------------------------------
    op.create_table(
        "user",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("hashed_password", sa.String(1024), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_superuser",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "role",
            sa.dialects.postgresql.ENUM(name="user_role", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "person_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("person.id", ondelete="RESTRICT", name="fk_user_person_id_person"),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(200), nullable=True),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email", name="uq_user_email"),
        sa.UniqueConstraint("person_id", name="uq_user_person_id"),
    )
    op.create_index("ix_user_role", "user", ["role"])

    # Now that user exists, add person.created_by FK back to it.
    op.create_foreign_key(
        "fk_person_created_by_user",
        "person",
        "user",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # -- event --------------------------------------------------------------
    op.create_table(
        "event",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lat", sa.Numeric(9, 6), nullable=False),
        sa.Column("lon", sa.Numeric(9, 6), nullable=False),
        sa.Column(
            "geom",
            Geography(geometry_type="POINT", srid=4326),
            sa.Computed(
                "ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography",
                persisted=True,
            ),
            nullable=False,
        ),
        sa.Column("w3w_legacy", sa.Text(), nullable=True),
        sa.Column(
            "reveal_participants",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL", name="fk_event_created_by_user"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("lat >= -90 AND lat <= 90", name="lat_range"),
        sa.CheckConstraint("lon >= -180 AND lon <= 180", name="lon_range"),
    )
    op.create_index("ix_event_started_at", "event", ["started_at"])
    op.create_index("ix_event_ended_at", "event", ["ended_at"])
    op.create_index("ix_event_created_by", "event", ["created_by"])
    op.execute("CREATE INDEX ix_event_geom ON event USING GIST (geom)")
    op.execute(
        "CREATE INDEX ix_event_note_fts ON event "
        "USING GIN (to_tsvector('german', coalesce(note, '')))"
    )

    # -- event_participant --------------------------------------------------
    op.create_table(
        "event_participant",
        sa.Column(
            "event_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "event.id", ondelete="CASCADE", name="fk_event_participant_event_id_event"
            ),
            nullable=False,
        ),
        sa.Column(
            "person_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "person.id", ondelete="RESTRICT", name="fk_event_participant_person_id_person"
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("event_id", "person_id", name="pk_event_participant"),
    )
    op.create_index("ix_event_participant_person_id", "event_participant", ["person_id"])

    # -- catalog: arm_position, hand_position, hand_orientation -------------
    for tname in ("arm_position", "hand_position", "hand_orientation"):
        op.create_table(
            tname,
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column(
                "status",
                sa.dialects.postgresql.ENUM(name="catalog_status", create_type=False),
                nullable=False,
                server_default="pending",
            ),
            sa.Column(
                "suggested_by",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey(
                    "user.id",
                    ondelete="SET NULL",
                    name=f"fk_{tname}_suggested_by_user",
                ),
                nullable=True,
            ),
            sa.Column(
                "approved_by",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey(
                    "user.id",
                    ondelete="SET NULL",
                    name=f"fk_{tname}_approved_by_user",
                ),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("name", name=f"uq_{tname}_name"),
        )
        op.create_index(f"ix_{tname}_status", tname, ["status"])

    # -- restraint_type -----------------------------------------------------
    op.create_table(
        "restraint_type",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "category",
            sa.dialects.postgresql.ENUM(name="restraint_category", create_type=False),
            nullable=False,
        ),
        sa.Column("brand", sa.String(120), nullable=True),
        sa.Column("model", sa.String(200), nullable=True),
        sa.Column(
            "mechanical_type",
            sa.dialects.postgresql.ENUM(name="restraint_mechanical_type", create_type=False),
            nullable=True,
        ),
        sa.Column("display_name", sa.String(300), nullable=False),
        sa.Column(
            "status",
            sa.dialects.postgresql.ENUM(name="catalog_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "suggested_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "user.id", ondelete="SET NULL", name="fk_restraint_type_suggested_by_user"
            ),
            nullable=True,
        ),
        sa.Column(
            "approved_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "user.id", ondelete="SET NULL", name="fk_restraint_type_approved_by_user"
            ),
            nullable=True,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "category",
            "brand",
            "model",
            "mechanical_type",
            name="uq_restraint_type_identity",
            postgresql_nulls_not_distinct=True,
        ),
    )
    op.create_index("ix_restraint_type_status", "restraint_type", ["status"])
    op.create_index("ix_restraint_type_category", "restraint_type", ["category"])
    op.create_index("ix_restraint_type_brand", "restraint_type", ["brand"])

    # -- application --------------------------------------------------------
    op.create_table(
        "application",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("event.id", ondelete="CASCADE", name="fk_application_event_id_event"),
            nullable=False,
        ),
        sa.Column(
            "performer_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "person.id", ondelete="RESTRICT", name="fk_application_performer_id_person"
            ),
            nullable=False,
        ),
        sa.Column(
            "recipient_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "person.id", ondelete="RESTRICT", name="fk_application_recipient_id_person"
            ),
            nullable=False,
        ),
        sa.Column(
            "arm_position_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "arm_position.id",
                ondelete="RESTRICT",
                name="fk_application_arm_position_id_arm_position",
            ),
            nullable=True,
        ),
        sa.Column(
            "hand_position_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "hand_position.id",
                ondelete="RESTRICT",
                name="fk_application_hand_position_id_hand_position",
            ),
            nullable=True,
        ),
        sa.Column(
            "hand_orientation_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "hand_orientation.id",
                ondelete="RESTRICT",
                name="fk_application_hand_orientation_id_hand_orientation",
            ),
            nullable=True,
        ),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL", name="fk_application_created_by_user"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("event_id", "sequence_no", name="uq_application_event_sequence"),
    )
    op.create_index("ix_application_event_id", "application", ["event_id"])
    op.create_index("ix_application_performer_id", "application", ["performer_id"])
    op.create_index("ix_application_recipient_id", "application", ["recipient_id"])
    op.create_index(
        "ix_application_event_id_sequence_no",
        "application",
        ["event_id", "sequence_no"],
    )
    op.execute(
        "CREATE INDEX ix_application_note_fts ON application "
        "USING GIN (to_tsvector('german', coalesce(note, '')))"
    )

    # -- application_restraint ---------------------------------------------
    op.create_table(
        "application_restraint",
        sa.Column(
            "application_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "application.id",
                ondelete="CASCADE",
                name="fk_application_restraint_application_id_application",
            ),
            nullable=False,
        ),
        sa.Column(
            "restraint_type_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "restraint_type.id",
                ondelete="RESTRICT",
                name="fk_application_restraint_restraint_type_id_restraint_type",
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint(
            "application_id", "restraint_type_id", name="pk_application_restraint"
        ),
    )
    op.create_index(
        "ix_application_restraint_restraint_type_id",
        "application_restraint",
        ["restraint_type_id"],
    )

    # -- updated_at triggers -----------------------------------------------
    for tname in _UPDATED_AT_TABLES:
        op.execute(
            f"CREATE TRIGGER set_updated_at_{tname} "
            f'BEFORE UPDATE ON "{tname}" '
            f"FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
        )

    # -- Grant baseline privileges to app_user -----------------------------
    # Schema usage and full DML on all tables we just created.
    op.execute("GRANT USAGE ON SCHEMA public TO app_user")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user")
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user")

    # -- RLS: enable + permissive default policy (M2 will replace with strict)
    for tname in _RLS_TABLES:
        op.execute(f'ALTER TABLE "{tname}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tname}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f'CREATE POLICY {tname}_default_permissive ON "{tname}" '
            f"FOR ALL TO app_user USING (true) WITH CHECK (true)"
        )


def downgrade() -> None:
    # Reverse order of creation; triggers and policies come down with their
    # tables, so drop tables explicitly.
    op.execute("DROP TABLE IF EXISTS application_restraint CASCADE")
    op.execute("DROP TABLE IF EXISTS application CASCADE")
    op.execute("DROP TABLE IF EXISTS restraint_type CASCADE")
    for tname in ("hand_orientation", "hand_position", "arm_position"):
        op.execute(f"DROP TABLE IF EXISTS {tname} CASCADE")
    op.execute("DROP TABLE IF EXISTS event_participant CASCADE")
    op.execute("DROP TABLE IF EXISTS event CASCADE")
    op.execute('DROP TABLE IF EXISTS "user" CASCADE')
    op.execute("DROP TABLE IF EXISTS person CASCADE")

    op.execute("DROP FUNCTION IF EXISTS set_updated_at() CASCADE")

    for enum_name in (
        "user_role",
        "person_origin",
        "catalog_status",
        "restraint_category",
        "restraint_mechanical_type",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")

    op.execute("REVOKE ALL ON SCHEMA public FROM app_user")
    op.execute("DROP ROLE IF EXISTS app_user")
    # PostGIS extension is intentionally NOT dropped (might be shared).
