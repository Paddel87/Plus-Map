"""M7.1 catalog workflow: rejected status, audit columns, RLS extensions.

Adds the reject/withdraw workflow on top of the M2 catalog policies
(see ADR-043):

- ``catalog_status`` enum gains ``rejected`` (`ALTER TYPE … ADD VALUE`).
- Each catalog table (`restraint_type`, `arm_position`, `hand_position`,
  `hand_orientation`) gets ``rejected_by``, ``rejected_at``,
  ``reject_reason`` columns.
- ``<table>_select`` is replaced so the proposing editor sees their own
  ``rejected`` rows (with reason) in addition to their own ``pending``.
- A new ``<table>_owner_withdraw`` policy lets editors DELETE their own
  ``pending`` rows; admin's existing ``<table>_admin_modify`` covers all
  other modifications (PATCH, approve, reject, hard-delete).

Revision ID: 20260428_1200_m7_1_catalog
Revises: 20260427_1900_m5c1b_ep_sync
Create Date: 2026-04-28 12:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260428_1200_m7_1_catalog"
down_revision: str | None = "20260427_1900_m5c1b_ep_sync"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_CATALOG_TABLES = ("restraint_type", "arm_position", "hand_position", "hand_orientation")


def upgrade() -> None:
    # 1. Enum extension. Postgres requires ADD VALUE to be visible in
    #    its own transaction before any DDL/DML can reference the new
    #    value (CREATE POLICY USING (... IN ('rejected')) below would
    #    otherwise trigger
    #    "unsafe use of new value 'rejected' of enum type"). The
    #    autocommit block commits before and after the statement.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE catalog_status ADD VALUE IF NOT EXISTS 'rejected'")

    # 2. Audit columns. Nullable on every catalog table.
    for tname in _CATALOG_TABLES:
        op.add_column(
            tname,
            sa.Column(
                "rejected_by",
                sa.dialects.postgresql.UUID(as_uuid=True),
                sa.ForeignKey("user.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.add_column(
            tname,
            sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.add_column(
            tname,
            sa.Column("reject_reason", sa.Text(), nullable=True),
        )

    # 3. Replace <table>_select policy so the proposing editor also sees
    #    own rejected rows.
    for tname in _CATALOG_TABLES:
        op.execute(f'DROP POLICY IF EXISTS {tname}_select ON "{tname}"')
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

    # 4. New owner-withdraw policy: editor DELETE on own pending.
    for tname in _CATALOG_TABLES:
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


def downgrade() -> None:
    # The downgrade has to (a) drop the 'rejected' enum value, which
    # Postgres can't do in place, and (b) restore the M2 policies. Since
    # any policy referencing ``status`` blocks ``ALTER COLUMN ... TYPE``,
    # we drop *all* status-touching policies first, swap the type, and
    # recreate the M2-shape policies at the end.

    # 1. Flip existing 'rejected' rows back so the cast won't fail.
    for tname in _CATALOG_TABLES:
        op.execute(f"UPDATE \"{tname}\" SET status = 'pending' WHERE status = 'rejected'")

    # 2. Drop M7.1 audit columns and the owner-withdraw policy.
    for tname in _CATALOG_TABLES:
        op.execute(f'DROP POLICY IF EXISTS {tname}_owner_withdraw ON "{tname}"')
        op.drop_column(tname, "reject_reason")
        op.drop_column(tname, "rejected_at")
        op.drop_column(tname, "rejected_by")

    # 3. Drop every catalog policy so the type swap can proceed.
    for tname in _CATALOG_TABLES:
        for pname in (f"{tname}_select", f"{tname}_propose", f"{tname}_admin_modify"):
            op.execute(f'DROP POLICY IF EXISTS {pname} ON "{tname}"')

    # 4. Swap catalog_status → catalog_status_v1 (without 'rejected') and
    #    rename back. Default values are dropped during the swap and
    #    restored afterwards.
    op.execute("CREATE TYPE catalog_status_v1 AS ENUM ('approved', 'pending')")
    for tname in _CATALOG_TABLES:
        op.execute(f'ALTER TABLE "{tname}" ALTER COLUMN status DROP DEFAULT')
        op.execute(
            f'ALTER TABLE "{tname}" ALTER COLUMN status TYPE catalog_status_v1 '
            f"USING status::text::catalog_status_v1"
        )
        op.execute(
            f"ALTER TABLE \"{tname}\" ALTER COLUMN status SET DEFAULT 'pending'::catalog_status_v1"
        )
    op.execute("DROP TYPE catalog_status")
    op.execute("ALTER TYPE catalog_status_v1 RENAME TO catalog_status")

    # 5. Recreate the M2 policies (mirror of strict_rls_policies upgrade).
    for tname in _CATALOG_TABLES:
        op.execute(
            f"""
            CREATE POLICY {tname}_select ON "{tname}"
                FOR SELECT TO app_user
                USING (
                    current_setting('app.current_role', true) = 'admin'
                    OR status = 'approved'
                    OR (
                        status = 'pending'
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
