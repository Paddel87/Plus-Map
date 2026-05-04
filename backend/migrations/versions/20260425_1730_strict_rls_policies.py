"""Replace M1's permissive RLS default with the per-role policies (M2).

Removes the four ``*_default_permissive`` policies introduced by
``20260425_1700_initial`` and installs the scoped policies described in
``architecture.md`` §RLS. Catalog tables (RestraintType, ArmPosition,
HandPosition, HandOrientation) gain RLS for the first time here.

Policies use ``current_setting(<key>, true)`` so a missing GUC returns
NULL and disables access rather than raising. Backend connections are
expected to ``SET LOCAL`` the four GUCs (role + user_id + person_id)
inside their request transaction (see ``app/rls.py``).

Revision ID: 20260425_1730_strict_rls
Revises: 20260425_1700_initial
Create Date: 2026-04-25 17:30:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260425_1730_strict_rls"
down_revision: str | None = "20260425_1700_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_DATA_TABLES = ("event", "event_participant", "application", "application_restraint")
_CATALOG_TABLES = ("restraint_type", "arm_position", "hand_position", "hand_orientation")


def upgrade() -> None:
    # 0. Helper functions that bypass RLS via SECURITY DEFINER. They
    #    centralise the "can the current request see / modify event X"
    #    logic so policies on event_participant / application can refer
    #    to event without triggering recursive policy evaluation. The
    #    functions read the per-request GUCs and are STABLE.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app_user_can_see_event(eid uuid)
        RETURNS boolean
        SECURITY DEFINER
        LANGUAGE sql
        STABLE AS $$
            SELECT
                current_setting('app.current_role', true) = 'admin'
                OR EXISTS (
                    SELECT 1 FROM event_participant ep
                    WHERE ep.event_id = eid
                      AND ep.person_id = current_setting('app.current_person_id', true)::uuid
                )
                OR (
                    current_setting('app.current_role', true) = 'editor'
                    AND EXISTS (
                        SELECT 1 FROM event e
                        WHERE e.id = eid
                          AND e.created_by = current_setting('app.current_user_id', true)::uuid
                    )
                )
        $$
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app_user_owns_event(eid uuid)
        RETURNS boolean
        SECURITY DEFINER
        LANGUAGE sql
        STABLE AS $$
            SELECT EXISTS (
                SELECT 1 FROM event e
                WHERE e.id = eid
                  AND e.created_by = current_setting('app.current_user_id', true)::uuid
            )
        $$
        """
    )
    op.execute("GRANT EXECUTE ON FUNCTION app_user_can_see_event(uuid) TO app_user")
    op.execute("GRANT EXECUTE ON FUNCTION app_user_owns_event(uuid) TO app_user")

    # 1. Drop the M1 permissive defaults so the restrictive policies below
    #    are the only ones evaluated.
    for tname in _DATA_TABLES:
        op.execute(f'DROP POLICY IF EXISTS {tname}_default_permissive ON "{tname}"')

    # 2. EVENT --------------------------------------------------------------
    op.execute(
        """
        CREATE POLICY event_admin_all ON "event"
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY event_member_select ON "event"
            FOR SELECT TO app_user
            USING (
                current_setting('app.current_role', true) IN ('editor', 'viewer')
                AND EXISTS (
                    SELECT 1 FROM event_participant ep
                    WHERE ep.event_id = "event".id
                      AND ep.person_id = current_setting('app.current_person_id', true)::uuid
                )
            )
        """
    )
    op.execute(
        """
        CREATE POLICY event_editor_insert ON "event"
            FOR INSERT TO app_user
            WITH CHECK (
                current_setting('app.current_role', true) = 'editor'
                AND created_by = current_setting('app.current_user_id', true)::uuid
            )
        """
    )
    op.execute(
        """
        CREATE POLICY event_editor_update ON "event"
            FOR UPDATE TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND created_by = current_setting('app.current_user_id', true)::uuid
            )
            WITH CHECK (created_by = current_setting('app.current_user_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY event_editor_delete ON "event"
            FOR DELETE TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND created_by = current_setting('app.current_user_id', true)::uuid
            )
        """
    )

    # 3. EVENT_PARTICIPANT --------------------------------------------------
    # Uses app_user_can_see_event / app_user_owns_event helpers to avoid
    # recursive RLS evaluation between event and event_participant.
    op.execute(
        """
        CREATE POLICY event_participant_admin_all ON event_participant
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY event_participant_member_select ON event_participant
            FOR SELECT TO app_user
            USING (app_user_can_see_event(event_id))
        """
    )
    op.execute(
        """
        CREATE POLICY event_participant_editor_modify ON event_participant
            FOR ALL TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND app_user_owns_event(event_id)
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'editor'
                AND app_user_owns_event(event_id)
            )
        """
    )

    # 4. APPLICATION --------------------------------------------------------
    op.execute(
        """
        CREATE POLICY application_admin_all ON application
            FOR ALL TO app_user
            USING (current_setting('app.current_role', true) = 'admin')
            WITH CHECK (current_setting('app.current_role', true) = 'admin')
        """
    )
    op.execute(
        """
        CREATE POLICY application_member_select ON application
            FOR SELECT TO app_user
            USING (app_user_can_see_event(event_id))
        """
    )
    op.execute(
        """
        CREATE POLICY application_editor_modify ON application
            FOR ALL TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND app_user_owns_event(event_id)
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'editor'
                AND app_user_owns_event(event_id)
            )
        """
    )

    # 5. APPLICATION_RESTRAINT (mirrors application via sub-select) --------
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

    # 6. CATALOG TABLES -----------------------------------------------------
    # Enable RLS on the four catalog tables; admin sees everything,
    # editors see approved + their own pending, viewers see only approved.
    for tname in _CATALOG_TABLES:
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


def downgrade() -> None:
    # Strict policies away.
    strict_event = (
        "event_admin_all",
        "event_member_select",
        "event_editor_insert",
        "event_editor_update",
        "event_editor_delete",
    )
    for name in strict_event:
        op.execute(f'DROP POLICY IF EXISTS {name} ON "event"')

    for tname, names in (
        (
            "event_participant",
            ("admin_all", "member_select", "editor_modify"),
        ),
        ("application", ("admin_all", "member_select", "editor_modify")),
        (
            "application_restraint",
            ("admin_all", "member_select", "editor_modify"),
        ),
    ):
        for name in names:
            op.execute(f'DROP POLICY IF EXISTS {tname}_{name} ON "{tname}"')

    for tname in _CATALOG_TABLES:
        for kind in ("select", "propose", "admin_modify"):
            op.execute(f'DROP POLICY IF EXISTS {tname}_{kind} ON "{tname}"')
        op.execute(f'ALTER TABLE "{tname}" DISABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tname}" NO FORCE ROW LEVEL SECURITY')

    # Restore the M1 permissive defaults so the system stays usable on
    # downgrade.
    for tname in _DATA_TABLES:
        op.execute(
            f'CREATE POLICY {tname}_default_permissive ON "{tname}" '
            f"FOR ALL TO app_user USING (true) WITH CHECK (true)"
        )

    op.execute("DROP FUNCTION IF EXISTS app_user_can_see_event(uuid)")
    op.execute("DROP FUNCTION IF EXISTS app_user_owns_event(uuid)")
