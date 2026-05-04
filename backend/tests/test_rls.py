"""Row-Level-Security tests for the strict M2 policies.

Each test sets the three GUCs that ``app/rls.py:stamp_session`` would
set in production and verifies that ``app_user`` sees / can modify
exactly the expected rows. Tests are sync (psycopg) so they can re-bind
the role and GUCs explicitly without async fixture juggling.

DoD reference: fahrplan.md §M2 acceptance criteria.
"""

from __future__ import annotations

import secrets
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from app.models.base import uuid7
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import ProgrammingError


@pytest.fixture
def role_session(db_engine: Engine) -> Iterator[object]:
    """Yield a helper that opens a connection, sets the GUCs and role,
    and runs callbacks. Each call uses a fresh transaction that is
    rolled back on exit, keeping the database clean across tests.
    """

    class _Helper:
        def __init__(self, engine: Engine) -> None:
            self.engine = engine

        def setup_world(self) -> dict[str, uuid.UUID]:
            """Insert two persons + two events (one per person) as superuser
            so RLS doesn't get in the way during fixture setup. Returns a
            handle dict for tests."""
            with self.engine.begin() as conn:
                pid_alice = uuid7()
                pid_bob = uuid7()
                uid_alice = uuid7()
                uid_bob = uuid7()
                event_alice = uuid7()
                event_bob = uuid7()

                conn.execute(
                    text("INSERT INTO person (id, name) VALUES (:id1, 'Alice'), (:id2, 'Bob')"),
                    {"id1": pid_alice, "id2": pid_bob},
                )
                conn.execute(
                    text(
                        'INSERT INTO "user" (id, email, hashed_password, role, person_id) '
                        "VALUES (:u1, :e1, 'x', 'editor', :p1), "
                        "(:u2, :e2, 'x', 'editor', :p2)"
                    ),
                    {
                        "u1": uid_alice,
                        "u2": uid_bob,
                        "e1": f"alice-{secrets.token_hex(3)}@example.invalid",
                        "e2": f"bob-{secrets.token_hex(3)}@example.invalid",
                        "p1": pid_alice,
                        "p2": pid_bob,
                    },
                )
                # Two events, each created by its respective owner; participation
                # mirrors creator-only.
                now = datetime.now(tz=UTC)
                conn.execute(
                    text(
                        "INSERT INTO event (id, started_at, lat, lon, created_by) "
                        "VALUES (:id1, :ts, 52.5, 13.4, :u1), "
                        "(:id2, :ts, 50.0, 8.0, :u2)"
                    ),
                    {
                        "id1": event_alice,
                        "id2": event_bob,
                        "ts": now,
                        "u1": uid_alice,
                        "u2": uid_bob,
                    },
                )
                conn.execute(
                    text(
                        "INSERT INTO event_participant (event_id, person_id) "
                        "VALUES (:e1, :p1), (:e2, :p2)"
                    ),
                    {
                        "e1": event_alice,
                        "e2": event_bob,
                        "p1": pid_alice,
                        "p2": pid_bob,
                    },
                )
            return {
                "person_alice": pid_alice,
                "person_bob": pid_bob,
                "user_alice": uid_alice,
                "user_bob": uid_bob,
                "event_alice": event_alice,
                "event_bob": event_bob,
            }

        def visible_event_ids(
            self, role: str, user_id: uuid.UUID, person_id: uuid.UUID
        ) -> set[uuid.UUID]:
            with self.engine.connect() as conn, conn.begin():
                conn.execute(text("SET LOCAL ROLE app_user"))
                conn.execute(
                    text("SELECT set_config('app.current_role', :v, true)"),
                    {"v": role},
                )
                conn.execute(
                    text("SELECT set_config('app.current_user_id', :v, true)"),
                    {"v": str(user_id)},
                )
                conn.execute(
                    text("SELECT set_config('app.current_person_id', :v, true)"),
                    {"v": str(person_id)},
                )
                rows = conn.execute(text('SELECT id FROM "event"')).all()
            return {r[0] for r in rows}

        def cleanup(self, world: dict[str, uuid.UUID]) -> None:
            """Tear down the rows we created so subsequent tests start clean."""
            with self.engine.begin() as conn:
                conn.execute(
                    text("DELETE FROM event WHERE id IN (:e1, :e2)"),
                    {"e1": world["event_alice"], "e2": world["event_bob"]},
                )
                conn.execute(
                    text('DELETE FROM "user" WHERE id IN (:u1, :u2)'),
                    {"u1": world["user_alice"], "u2": world["user_bob"]},
                )
                conn.execute(
                    text("DELETE FROM person WHERE id IN (:p1, :p2)"),
                    {"p1": world["person_alice"], "p2": world["person_bob"]},
                )

    helper = _Helper(db_engine)
    world = helper.setup_world()
    try:
        yield helper, world
    finally:
        helper.cleanup(world)


def test_admin_sees_all_events(role_session) -> None:
    helper, world = role_session
    visible = helper.visible_event_ids(
        role="admin",
        user_id=world["user_alice"],
        person_id=world["person_alice"],
    )
    assert {world["event_alice"], world["event_bob"]} <= visible


def test_editor_sees_only_own_participation(role_session) -> None:
    helper, world = role_session
    visible = helper.visible_event_ids(
        role="editor",
        user_id=world["user_alice"],
        person_id=world["person_alice"],
    )
    assert visible == {world["event_alice"]}


def test_viewer_sees_only_own_participation(role_session) -> None:
    helper, world = role_session
    visible = helper.visible_event_ids(
        role="viewer",
        user_id=world["user_bob"],
        person_id=world["person_bob"],
    )
    assert visible == {world["event_bob"]}


def test_editor_cannot_insert_event_with_foreign_created_by(
    db_engine: Engine, role_session
) -> None:
    _, world = role_session
    # Try to insert an event as Alice but pretend Bob is the creator.
    with db_engine.connect() as conn, conn.begin():
        conn.execute(text("SET LOCAL ROLE app_user"))
        conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
        conn.execute(
            text("SELECT set_config('app.current_user_id', :v, true)"),
            {"v": str(world["user_alice"])},
        )
        with pytest.raises(ProgrammingError):
            conn.execute(
                text(
                    "INSERT INTO event (id, started_at, lat, lon, created_by) "
                    "VALUES (:id, now(), 0, 0, :owner)"
                ),
                {"id": uuid7(), "owner": world["user_bob"]},
            )


def test_editor_can_insert_own_event(db_engine: Engine, role_session) -> None:
    _, world = role_session
    new_id = uuid7()
    with db_engine.connect() as conn, conn.begin():
        conn.execute(text("SET LOCAL ROLE app_user"))
        conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
        conn.execute(
            text("SELECT set_config('app.current_user_id', :v, true)"),
            {"v": str(world["user_alice"])},
        )
        conn.execute(
            text("SELECT set_config('app.current_person_id', :v, true)"),
            {"v": str(world["person_alice"])},
        )
        conn.execute(
            text(
                "INSERT INTO event (id, started_at, lat, lon, created_by) "
                "VALUES (:id, now(), 0, 0, :owner)"
            ),
            {"id": new_id, "owner": world["user_alice"]},
        )
    # Cleanup: superuser deletes the row we just created.
    with db_engine.begin() as conn:
        conn.execute(text("DELETE FROM event WHERE id = :id"), {"id": new_id})


def test_viewer_sees_only_approved_catalog(db_engine: Engine, role_session) -> None:
    _, world = role_session
    pending_id = uuid7()
    approved_id = uuid7()
    # As superuser, seed one approved + one pending RestraintType
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by) "
                "VALUES (:id1, 'rope', null, :m1, null, :n1, 'approved', null), "
                "(:id2, 'rope', null, :m2, null, :n2, 'pending', :sb)"
            ),
            {
                "id1": approved_id,
                "m1": f"approved-{secrets.token_hex(3)}",
                "n1": "Approved",
                "id2": pending_id,
                "m2": f"pending-{secrets.token_hex(3)}",
                "n2": "Pending",
                "sb": world["user_alice"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'viewer', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_bob"])},
            )
            rows = conn.execute(
                text("SELECT id FROM restraint_type WHERE id IN (:a, :p)"),
                {"a": approved_id, "p": pending_id},
            ).all()
            visible = {r[0] for r in rows}
        assert visible == {approved_id}
    finally:
        with db_engine.begin() as conn:
            conn.execute(
                text("DELETE FROM restraint_type WHERE id IN (:a, :p)"),
                {"a": approved_id, "p": pending_id},
            )


def test_editor_sees_own_pending_catalog(db_engine: Engine, role_session) -> None:
    _, world = role_session
    own_pending = uuid7()
    other_pending = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by) "
                "VALUES (:id1, 'rope', null, :m1, null, :n1, 'pending', :sb1), "
                "(:id2, 'rope', null, :m2, null, :n2, 'pending', :sb2)"
            ),
            {
                "id1": own_pending,
                "m1": f"own-{secrets.token_hex(3)}",
                "n1": "Own pending",
                "id2": other_pending,
                "m2": f"other-{secrets.token_hex(3)}",
                "n2": "Other pending",
                "sb1": world["user_alice"],
                "sb2": world["user_bob"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_alice"])},
            )
            rows = conn.execute(
                text("SELECT id FROM restraint_type WHERE id IN (:a, :b)"),
                {"a": own_pending, "b": other_pending},
            ).all()
            visible = {r[0] for r in rows}
        assert visible == {own_pending}
    finally:
        with db_engine.begin() as conn:
            conn.execute(
                text("DELETE FROM restraint_type WHERE id IN (:a, :b)"),
                {"a": own_pending, "b": other_pending},
            )


def test_editor_sees_own_rejected_catalog(db_engine: Engine, role_session) -> None:
    """ADR-043: proposing editor keeps visibility of own rejected rows."""
    _, world = role_session
    own_rejected = uuid7()
    other_rejected = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by, "
                "rejected_by, reject_reason) "
                "VALUES "
                "(:id1, 'rope', null, :m1, null, :n1, 'rejected', :sb1, :rb, :rr1), "
                "(:id2, 'rope', null, :m2, null, :n2, 'rejected', :sb2, :rb, :rr2)"
            ),
            {
                "id1": own_rejected,
                "m1": f"own-rej-{secrets.token_hex(3)}",
                "n1": "Own rejected",
                "rr1": "no good",
                "id2": other_rejected,
                "m2": f"other-rej-{secrets.token_hex(3)}",
                "n2": "Other rejected",
                "rr2": "also no",
                "sb1": world["user_alice"],
                "sb2": world["user_bob"],
                # placeholder; rejector identity is irrelevant for SELECT-RLS
                "rb": world["user_alice"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_alice"])},
            )
            rows = conn.execute(
                text("SELECT id FROM restraint_type WHERE id IN (:a, :b)"),
                {"a": own_rejected, "b": other_rejected},
            ).all()
            visible = {r[0] for r in rows}
        assert visible == {own_rejected}
    finally:
        with db_engine.begin() as conn:
            conn.execute(
                text("DELETE FROM restraint_type WHERE id IN (:a, :b)"),
                {"a": own_rejected, "b": other_rejected},
            )


def test_viewer_does_not_see_rejected(db_engine: Engine, role_session) -> None:
    """Viewer must not see any rejected catalog rows, ever."""
    _, world = role_session
    rid = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by, "
                "rejected_by, reject_reason) "
                "VALUES (:id, 'rope', null, :m, null, :n, 'rejected', :sb, :rb, :rr)"
            ),
            {
                "id": rid,
                "m": f"rej-viewer-{secrets.token_hex(3)}",
                "n": "Should be hidden",
                "rr": "redacted",
                "sb": world["user_alice"],
                "rb": world["user_alice"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'viewer', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_bob"])},
            )
            rows = conn.execute(
                text("SELECT id FROM restraint_type WHERE id = :id"),
                {"id": rid},
            ).all()
        assert rows == []
    finally:
        with db_engine.begin() as conn:
            conn.execute(text("DELETE FROM restraint_type WHERE id = :id"), {"id": rid})


def test_editor_can_delete_own_pending_via_rls(db_engine: Engine, role_session) -> None:
    """ADR-043 owner-withdraw policy: editor DELETE on own pending."""
    _, world = role_session
    own_pending = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by) "
                "VALUES (:id, 'rope', null, :m, null, :n, 'pending', :sb)"
            ),
            {
                "id": own_pending,
                "m": f"editor-del-{secrets.token_hex(3)}",
                "n": "Editor can delete own pending",
                "sb": world["user_alice"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_alice"])},
            )
            result = conn.execute(
                text("DELETE FROM restraint_type WHERE id = :id"),
                {"id": own_pending},
            )
            assert result.rowcount == 1
    finally:
        with db_engine.begin() as conn:
            conn.execute(text("DELETE FROM restraint_type WHERE id = :id"), {"id": own_pending})


def test_editor_cannot_delete_foreign_pending_via_rls(db_engine: Engine, role_session) -> None:
    """Editor must not be able to DELETE another editor's pending row."""
    _, world = role_session
    other_pending = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by) "
                "VALUES (:id, 'rope', null, :m, null, :n, 'pending', :sb)"
            ),
            {
                "id": other_pending,
                "m": f"editor-foreign-{secrets.token_hex(3)}",
                "n": "Foreign pending",
                "sb": world["user_bob"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_alice"])},
            )
            result = conn.execute(
                text("DELETE FROM restraint_type WHERE id = :id"),
                {"id": other_pending},
            )
            # RLS hides the foreign pending from editor A entirely, so
            # the DELETE matches zero rows. (A symmetric check via SELECT
            # is exercised in test_editor_sees_own_pending_catalog.)
            assert result.rowcount == 0
    finally:
        with db_engine.begin() as conn:
            conn.execute(
                text("DELETE FROM restraint_type WHERE id = :id"),
                {"id": other_pending},
            )


def test_editor_cannot_delete_own_rejected_via_rls(db_engine: Engine, role_session) -> None:
    """Editor sees own rejected (read-only) but cannot DELETE it via RLS."""
    _, world = role_session
    own_rejected = uuid7()
    with db_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO restraint_type (id, category, brand, model, "
                "mechanical_type, display_name, status, suggested_by, "
                "rejected_by, reject_reason) "
                "VALUES (:id, 'rope', null, :m, null, :n, 'rejected', :sb, :rb, :rr)"
            ),
            {
                "id": own_rejected,
                "m": f"editor-rej-{secrets.token_hex(3)}",
                "n": "Own rejected",
                "rr": "no",
                "sb": world["user_alice"],
                "rb": world["user_alice"],
            },
        )
    try:
        with db_engine.connect() as conn, conn.begin():
            conn.execute(text("SET LOCAL ROLE app_user"))
            conn.execute(text("SELECT set_config('app.current_role', 'editor', true)"))
            conn.execute(
                text("SELECT set_config('app.current_user_id', :v, true)"),
                {"v": str(world["user_alice"])},
            )
            result = conn.execute(
                text("DELETE FROM restraint_type WHERE id = :id"),
                {"id": own_rejected},
            )
            # Editor is allowed to SELECT (status = 'rejected' AND own)
            # but not DELETE — owner-withdraw policy only matches
            # status = 'pending'. Postgres returns 0 affected rows.
            assert result.rowcount == 0
    finally:
        with db_engine.begin() as conn:
            conn.execute(text("DELETE FROM restraint_type WHERE id = :id"), {"id": own_rejected})
