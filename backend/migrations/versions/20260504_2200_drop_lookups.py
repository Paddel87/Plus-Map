"""Drop arm/hand-position lookup tables and their FKs (M0.2, ADR-001).

Removes the three lookup tables ``arm_position``, ``hand_position`` and
``hand_orientation`` carried over from the upstream snapshot, plus the
matching FK columns on ``application`` (``arm_position_id``,
``hand_position_id``, ``hand_orientation_id``). Per ADR-001, Plus-Map
does not need these — they belonged to the original (different) domain
of the upstream project. RLS policies and audit-FK constraints on the
three tables are removed by the table drop itself.

Revision ID: 20260504_2200_drop_lookups
Revises: 20260503_2000_event_precision
Create Date: 2026-05-04 22:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260504_2200_drop_lookups"
down_revision: str | None = "20260503_2000_event_precision"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_DROPPED_TABLES = ("arm_position", "hand_position", "hand_orientation")


def upgrade() -> None:
    # 1. Drop FK columns on application. The named constraints are
    #    removed implicitly by ``DROP COLUMN``.
    for col in ("arm_position_id", "hand_position_id", "hand_orientation_id"):
        op.drop_column("application", col)

    # 2. Drop the lookup tables. CASCADE removes RLS policies, indexes
    #    and the audit FKs to ``user``.
    for tname in _DROPPED_TABLES:
        op.execute(f'DROP TABLE IF EXISTS "{tname}" CASCADE')


def downgrade() -> None:
    # Recreate the three lookup tables in their final M7.1 shape (status
    # enum + audit columns) so an upgrade-downgrade-upgrade roundtrip
    # leaves the DB intact. RLS policies, indexes and the
    # ``set_updated_at`` trigger are re-added below.
    for tname in _DROPPED_TABLES:
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
                "rejected_by",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey("user.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reject_reason", sa.Text(), nullable=True),
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

        # set_updated_at trigger (mirrors the M1 setup).
        op.execute(
            f"""
            CREATE TRIGGER trg_{tname}_updated_at
            BEFORE UPDATE ON "{tname}"
            FOR EACH ROW EXECUTE FUNCTION set_updated_at()
            """
        )

        # RLS policies (mirror of M2 strict + M7.1 owner-withdraw).
        op.execute(f'ALTER TABLE "{tname}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tname}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f"""
            CREATE POLICY {tname}_select ON "{tname}"
                FOR SELECT TO app_user
                USING (
                    current_setting('app.current_role', true) = 'admin'
                    OR status = 'approved'
                    OR (
                        status IN ('pending', 'rejected')
                        AND suggested_by
                          = current_setting('app.current_user_id', true)::uuid
                    )
                )
            """
        )
        op.execute(
            f"""
            CREATE POLICY {tname}_propose ON "{tname}"
                FOR INSERT TO app_user
                WITH CHECK (
                    current_setting('app.current_role', true) IN ('editor', 'admin')
                    AND (
                        current_setting('app.current_role', true) = 'admin'
                        OR (
                            status = 'pending'
                            AND suggested_by
                              = current_setting('app.current_user_id', true)::uuid
                        )
                    )
                )
            """
        )
        op.execute(
            f"""
            CREATE POLICY {tname}_admin_modify ON "{tname}"
                FOR ALL TO app_user
                USING (current_setting('app.current_role', true) = 'admin')
                WITH CHECK (current_setting('app.current_role', true) = 'admin')
            """
        )
        op.execute(
            f"""
            CREATE POLICY {tname}_owner_withdraw ON "{tname}"
                FOR DELETE TO app_user
                USING (
                    current_setting('app.current_role', true) = 'editor'
                    AND status = 'pending'
                    AND suggested_by
                      = current_setting('app.current_user_id', true)::uuid
                )
            """
        )

    # Re-add the FK columns on application.
    op.add_column(
        "application",
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
    )
    op.add_column(
        "application",
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
    )
    op.add_column(
        "application",
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
    )
