"""Rename restraint catalog domain to equipment-item domain (M0.3, ADR-002).

Welle 2 of the Tarnungs-Cut: brings the backend identifiers in line with
the outdoor-tour positioning of the README.

Renames:
    Tables:
        restraint_type        → equipment_item
        application_restraint → application_equipment
    Columns:
        application_equipment.restraint_type_id → equipment_item_id
    Indexes / constraints:
        ix_restraint_type_*                         → ix_equipment_item_*
        uq_restraint_type_identity                  → uq_equipment_item_identity
        ix_application_restraint_restraint_type_id  → ix_application_equipment_equipment_item_id
        pk_application_restraint                    → pk_application_equipment
        FK constraints renamed parallel
    RLS policies on both tables renamed; bodies are recreated since the
    embedded table-qualified column references would otherwise still
    spell the old name in pg_policy.
    Trigger:
        trg_restraint_type_updated_at  → trg_equipment_item_updated_at
    Enum types:
        restraint_category         → equipment_category (new value set)
        restraint_mechanical_type  → DROPPED
        Column ``equipment_item.mechanical_type``  → DROPPED
        Unique constraint loses its mechanical_type column.

The new equipment_category enum maps from the old restraint_category as
``'other'`` for every existing row — there is no semantic mapping
between e.g. ``handcuffs`` and any outdoor category.

Revision ID: 20260505_1300_equipment_rename
Revises: 20260504_2200_drop_lookups
Create Date: 2026-05-05 13:00:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260505_1300_equipment_rename"
down_revision: str | None = "20260504_2200_drop_lookups"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Drop RLS policies that reference the soon-to-be-renamed tables.
    #    Recreated below after the rename with new names + bodies.
    for policy in (
        "restraint_type_select",
        "restraint_type_propose",
        "restraint_type_admin_modify",
        "restraint_type_owner_withdraw",
    ):
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "restraint_type"')
    for policy in (
        "application_restraint_admin_all",
        "application_restraint_member_select",
        "application_restraint_editor_modify",
    ):
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "application_restraint"')

    # 2. Drop the updated_at trigger; re-created on the renamed table.
    op.execute('DROP TRIGGER IF EXISTS trg_restraint_type_updated_at ON "restraint_type"')

    # 3. Drop the unique constraint that includes mechanical_type.
    op.drop_constraint("uq_restraint_type_identity", "restraint_type", type_="unique")

    # 4. Drop the mechanical_type column and its now-unused enum type.
    op.drop_column("restraint_type", "mechanical_type")
    op.execute("DROP TYPE restraint_mechanical_type")

    # 5. Create the new equipment_category enum.
    op.execute(
        """
        CREATE TYPE equipment_category AS ENUM (
            'navigation',
            'lighting',
            'hydration',
            'nutrition',
            'safety',
            'tools',
            'documentation',
            'comfort',
            'mobility',
            'carrying',
            'clothing',
            'shelter',
            'other'
        )
        """
    )

    # 6. Convert the category column. No semantic mapping exists from the
    #    old restraint categories to outdoor categories; map every existing
    #    row to 'other' and let the operator re-categorise manually.
    op.execute(
        """
        ALTER TABLE restraint_type
        ALTER COLUMN category TYPE equipment_category
        USING 'other'::equipment_category
        """
    )
    op.execute("DROP TYPE restraint_category")

    # 7. Rename the catalog table indexes.
    op.execute("ALTER INDEX ix_restraint_type_status RENAME TO ix_equipment_item_status")
    op.execute("ALTER INDEX ix_restraint_type_category RENAME TO ix_equipment_item_category")
    op.execute("ALTER INDEX ix_restraint_type_brand RENAME TO ix_equipment_item_brand")

    # 8. Rename the catalog table itself; FKs from application_restraint
    #    follow automatically via internal references.
    op.rename_table("restraint_type", "equipment_item")

    # 9. Rename the audit FK constraints + the (auto-named) PK to keep
    #    names in lockstep with the table.
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT pk_restraint_type TO pk_equipment_item"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_restraint_type_suggested_by_user TO fk_equipment_item_suggested_by_user"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_restraint_type_approved_by_user TO fk_equipment_item_approved_by_user"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_restraint_type_rejected_by_user TO fk_equipment_item_rejected_by_user"
    )

    # 10. Add the new identity unique constraint without mechanical_type.
    op.execute(
        """
        ALTER TABLE equipment_item
        ADD CONSTRAINT uq_equipment_item_identity
        UNIQUE NULLS NOT DISTINCT (category, brand, model)
        """
    )

    # 11. Re-create the updated_at trigger.
    op.execute(
        """
        CREATE TRIGGER trg_equipment_item_updated_at
        BEFORE UPDATE ON "equipment_item"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
        """
    )

    # 12. Re-create the catalog RLS policies on equipment_item (mirror M2
    #     strict + M7.1 owner-withdraw shape).
    op.execute('ALTER TABLE "equipment_item" ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE "equipment_item" FORCE ROW LEVEL SECURITY')
    op.execute(
        """
        CREATE POLICY equipment_item_select ON "equipment_item"
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
        """
        CREATE POLICY equipment_item_propose ON "equipment_item"
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
        """
        CREATE POLICY equipment_item_admin_modify ON "equipment_item"
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY equipment_item_owner_withdraw ON "equipment_item"
            FOR DELETE TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND status = 'pending'
                AND suggested_by
                  = current_setting('app.current_user_id', true)::uuid
            )
        """
    )

    # 13. Rename the join-table index, table, column, PK and FKs.
    op.execute(
        "ALTER INDEX ix_application_restraint_restraint_type_id "
        "RENAME TO ix_application_equipment_equipment_item_id"
    )
    op.rename_table("application_restraint", "application_equipment")
    op.alter_column(
        "application_equipment",
        "restraint_type_id",
        new_column_name="equipment_item_id",
    )
    op.execute(
        "ALTER TABLE application_equipment "
        "RENAME CONSTRAINT pk_application_restraint TO pk_application_equipment"
    )
    op.execute(
        "ALTER TABLE application_equipment RENAME CONSTRAINT "
        "fk_application_restraint_application_id_application "
        "TO fk_application_equipment_application_id_application"
    )
    op.execute(
        "ALTER TABLE application_equipment RENAME CONSTRAINT "
        "fk_application_restraint_restraint_type_id_restraint_type "
        "TO fk_application_equipment_equipment_item_id_equipment_item"
    )

    # 14. Re-create the join-table RLS policies on application_equipment.
    op.execute(
        """
        CREATE POLICY application_equipment_admin_all ON application_equipment
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY application_equipment_member_select ON application_equipment
            FOR SELECT TO app_user
            USING (
                EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_equipment.application_id
                      AND app_user_can_see_event(a.event_id)
                )
            )
        """
    )
    op.execute(
        """
        CREATE POLICY application_equipment_editor_modify ON application_equipment
            FOR ALL TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_equipment.application_id
                      AND app_user_owns_event(a.event_id)
                )
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'editor'
                AND EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_equipment.application_id
                      AND app_user_owns_event(a.event_id)
                )
            )
        """
    )


def downgrade() -> None:
    # 1. Drop the new RLS policies before the rename so the policy names
    #    referencing the new table are gone.
    for policy in (
        "application_equipment_admin_all",
        "application_equipment_member_select",
        "application_equipment_editor_modify",
    ):
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "application_equipment"')

    # 2. Reverse join-table renames.
    op.execute(
        "ALTER TABLE application_equipment RENAME CONSTRAINT "
        "fk_application_equipment_equipment_item_id_equipment_item "
        "TO fk_application_restraint_restraint_type_id_restraint_type"
    )
    op.execute(
        "ALTER TABLE application_equipment RENAME CONSTRAINT "
        "fk_application_equipment_application_id_application "
        "TO fk_application_restraint_application_id_application"
    )
    op.execute(
        "ALTER TABLE application_equipment "
        "RENAME CONSTRAINT pk_application_equipment TO pk_application_restraint"
    )
    op.alter_column(
        "application_equipment",
        "equipment_item_id",
        new_column_name="restraint_type_id",
    )
    op.rename_table("application_equipment", "application_restraint")
    op.execute(
        "ALTER INDEX ix_application_equipment_equipment_item_id "
        "RENAME TO ix_application_restraint_restraint_type_id"
    )

    # 3. Drop equipment_item RLS, trigger, identity constraint, then
    #    table-rename it back to restraint_type.
    for policy in (
        "equipment_item_owner_withdraw",
        "equipment_item_admin_modify",
        "equipment_item_propose",
        "equipment_item_select",
    ):
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "equipment_item"')
    op.execute('DROP TRIGGER IF EXISTS trg_equipment_item_updated_at ON "equipment_item"')
    op.drop_constraint("uq_equipment_item_identity", "equipment_item", type_="unique")
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_equipment_item_rejected_by_user TO fk_restraint_type_rejected_by_user"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_equipment_item_approved_by_user TO fk_restraint_type_approved_by_user"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT "
        "fk_equipment_item_suggested_by_user TO fk_restraint_type_suggested_by_user"
    )
    op.execute(
        "ALTER TABLE equipment_item RENAME CONSTRAINT pk_equipment_item TO pk_restraint_type"
    )
    op.rename_table("equipment_item", "restraint_type")
    op.execute("ALTER INDEX ix_equipment_item_brand RENAME TO ix_restraint_type_brand")
    op.execute("ALTER INDEX ix_equipment_item_category RENAME TO ix_restraint_type_category")
    op.execute("ALTER INDEX ix_equipment_item_status RENAME TO ix_restraint_type_status")

    # 4. Re-create the old enum types and convert the column back. Every
    #    row maps to 'other' since the upgrade had already collapsed
    #    everything to 'other'.
    op.execute(
        """
        CREATE TYPE restraint_category AS ENUM (
            'handcuffs', 'thumbcuffs', 'legcuffs', 'cuffs_leather',
            'rope', 'tape', 'cable_tie', 'cloth', 'strap', 'other'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE restraint_type
        ALTER COLUMN category TYPE restraint_category
        USING 'other'::restraint_category
        """
    )
    op.execute("DROP TYPE equipment_category")
    op.execute("CREATE TYPE restraint_mechanical_type AS ENUM ('chain', 'hinged', 'rigid')")

    # 5. Re-add the mechanical_type column and the original identity
    #    constraint (4 columns, NULLS NOT DISTINCT).
    op.add_column(
        "restraint_type",
        sa.Column(
            "mechanical_type",
            sa.dialects.postgresql.ENUM(name="restraint_mechanical_type", create_type=False),
            nullable=True,
        ),
    )
    op.execute(
        """
        ALTER TABLE restraint_type
        ADD CONSTRAINT uq_restraint_type_identity
        UNIQUE NULLS NOT DISTINCT (category, brand, model, mechanical_type)
        """
    )

    # 6. Re-create the M1 trigger.
    op.execute(
        """
        CREATE TRIGGER trg_restraint_type_updated_at
        BEFORE UPDATE ON "restraint_type"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
        """
    )

    # 7. Re-create the original RLS policies (mirror M2 + M7.1 shape).
    op.execute(
        """
        CREATE POLICY restraint_type_select ON "restraint_type"
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
        """
        CREATE POLICY restraint_type_propose ON "restraint_type"
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
        """
        CREATE POLICY restraint_type_admin_modify ON "restraint_type"
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY restraint_type_owner_withdraw ON "restraint_type"
            FOR DELETE TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND status = 'pending'
                AND suggested_by
                  = current_setting('app.current_user_id', true)::uuid
            )
        """
    )

    # 8. Re-create the join-table RLS policies on application_restraint.
    op.execute(
        """
        CREATE POLICY application_restraint_admin_all ON application_restraint
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY application_restraint_member_select ON application_restraint
            FOR SELECT TO app_user
            USING (
                EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_restraint.application_id
                      AND app_user_can_see_event(a.event_id)
                )
            )
        """
    )
    op.execute(
        """
        CREATE POLICY application_restraint_editor_modify ON application_restraint
            FOR ALL TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_restraint.application_id
                      AND app_user_owns_event(a.event_id)
                )
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'editor'
                AND EXISTS (
                    SELECT 1 FROM application a
                    WHERE a.id = application_restraint.application_id
                      AND app_user_owns_event(a.event_id)
                )
            )
        """
    )
