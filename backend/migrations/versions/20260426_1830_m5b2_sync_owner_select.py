"""M5b.2: editor sees own event/application via dedicated SELECT policy.

The strict-RLS migration from M2 lets editors see events/applications only
through ``event_participant`` membership. That works for the regular write
flow because the auto-participant insert runs in the same transaction as
the create. But ``INSERT ... RETURNING`` evaluates the table's SELECT
policy on the freshly-inserted row before the auto-participant link
exists — the RETURNING clause then violates ``event_member_select`` /
``application_member_select`` and the whole INSERT is rejected.

This migration adds two additive permissive SELECT policies that let an
editor see rows they themselves created, regardless of participant
membership. The policies are pure additions (OR-joined with the existing
member-select policies), match the same condition the editor's
UPDATE/DELETE policies already use, and unblock the M5b.2 sync push
endpoints. See ADR-033 for the design discussion.

Revision ID: 20260426_1830_m5b2_owner_select
Revises: 20260426_1800_m5b1_sync_columns
Create Date: 2026-04-26 18:30:00 UTC
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20260426_1830_m5b2_owner_select"
down_revision: str | None = "20260426_1800_m5b1_sync_columns"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE POLICY event_editor_select_own ON "event"
            FOR SELECT TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND created_by = current_setting('app.current_user_id', true)::uuid
            )
        """
    )
    op.execute(
        """
        CREATE POLICY application_editor_select_own ON application
            FOR SELECT TO app_user
            USING (
                current_setting('app.current_role', true) = 'editor'
                AND created_by = current_setting('app.current_user_id', true)::uuid
            )
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS application_editor_select_own ON application")
    op.execute('DROP POLICY IF EXISTS event_editor_select_own ON "event"')
