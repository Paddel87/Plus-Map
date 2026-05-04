"""Per-field conflict-resolution coverage for the sync push endpoints.

Maps directly to ADR-029:

* Immutable-after-create (lat/lon/started_at): an editor's push that
  changes those fields receives the server's master doc as a conflict.
* First-write-wins on ``ended_at``: once set, a different non-null value
  triggers a conflict.
* Last-write-wins on ``note``, ``reveal_participants`` and
  ``legacy_external_ref`` (ADR-050): server accepts the new value,
  ``updated_at`` is bumped server-side.
* Restore (``_deleted`` true → false) is rejected for non-admin callers.
"""

from __future__ import annotations

import uuid

import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import login_as, post_with_csrf


@pytest.fixture(autouse=True)
async def _clean(async_session_factory: async_sessionmaker[AsyncSession]):
    yield
    async with async_session_factory() as session, session.begin():
        await session.execute(text("DELETE FROM event_participant"))
        await session.execute(text("DELETE FROM application_restraint"))
        await session.execute(text("DELETE FROM application"))
        await session.execute(text("DELETE FROM event"))


def _new_event_doc(**overrides):
    base = {
        "id": str(uuid.uuid4()),
        "started_at": "2026-04-26T12:00:00+00:00",
        "ended_at": None,
        "lat": 52.5,
        "lon": 13.4,
        "legacy_external_ref": None,
        "reveal_participants": False,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-26T12:00:00+00:00",
        "updated_at": "2026-04-26T12:00:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }
    base.update(overrides)
    return base


async def _push_and_pull_master(
    client: AsyncClient,
    csrf: str,
    doc: dict,
) -> dict:
    """Insert a doc and return the server-side master representation."""
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200
    pull = await client.get("/api/sync/events/pull")
    return next(d for d in pull.json()["documents"] if d["id"] == doc["id"])


async def test_changing_lat_lon_after_create_returns_conflict(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    master = await _push_and_pull_master(client, csrf, doc)

    new_state = dict(master)
    new_state["lat"] = 0.0  # editor tries to move the event
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": new_state}],
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    # Conflict is the unchanged server master.
    assert body[0]["id"] == doc["id"]
    assert body[0]["lat"] == master["lat"]


async def test_changing_started_at_after_create_returns_conflict(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    master = await _push_and_pull_master(client, csrf, doc)

    new_state = dict(master)
    new_state["started_at"] = "2030-01-01T00:00:00+00:00"
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": new_state}],
    )
    body = resp.json()
    assert len(body) == 1
    assert body[0]["started_at"] == master["started_at"]


async def test_first_write_wins_on_ended_at(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    master = await _push_and_pull_master(client, csrf, doc)

    # First end: should accept.
    end_one = dict(master)
    end_one["ended_at"] = "2026-04-26T13:00:00+00:00"
    resp1 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": end_one}],
    )
    assert resp1.status_code == 200
    assert resp1.json() == []

    # Pull updated master.
    pull = await client.get("/api/sync/events/pull")
    master_after = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])
    # Pydantic serialises UTC as `Z`, accept both forms.
    assert master_after["ended_at"].startswith("2026-04-26T13:00:00")

    # Try to set a different ended_at: must conflict.
    end_two = dict(master_after)
    end_two["ended_at"] = "2026-04-26T14:00:00+00:00"
    resp2 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master_after, "newDocumentState": end_two}],
    )
    body2 = resp2.json()
    assert len(body2) == 1
    assert body2[0]["ended_at"].startswith("2026-04-26T13:00:00")


async def test_last_write_wins_on_note(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc(note="first")
    master = await _push_and_pull_master(client, csrf, doc)

    new_state = dict(master)
    new_state["note"] = "second"
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": new_state}],
    )
    assert resp.status_code == 200
    assert resp.json() == []  # accepted

    pull = await client.get("/api/sync/events/pull")
    refreshed = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])
    assert refreshed["note"] == "second"
    # updated_at advanced server-side.
    assert refreshed["updated_at"] != master["updated_at"]


async def test_last_write_wins_on_legacy_external_ref(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-050: legacy_external_ref is LWW (was immutable as w3w_legacy)."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc(legacy_external_ref="three.word.address")
    master = await _push_and_pull_master(client, csrf, doc)

    new_state = dict(master)
    new_state["legacy_external_ref"] = "different.three.words"
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": new_state}],
    )
    assert resp.status_code == 200
    assert resp.json() == []  # accepted, no conflict

    pull = await client.get("/api/sync/events/pull")
    refreshed = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])
    assert refreshed["legacy_external_ref"] == "different.three.words"


async def test_editor_cannot_restore_soft_deleted_event(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    master = await _push_and_pull_master(client, csrf, doc)

    # Soft-delete: accepted.
    deleted_state = dict(master)
    deleted_state["_deleted"] = True
    deleted_state["deleted_at"] = "2026-04-26T13:00:00+00:00"
    resp_del = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": deleted_state}],
    )
    assert resp_del.json() == []

    # Try to restore: rejected (admin-only per ADR-029).
    pull = await client.get("/api/sync/events/pull")
    tombstone = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])
    assert tombstone["_deleted"] is True

    restore_state = dict(tombstone)
    restore_state["_deleted"] = False
    restore_state["deleted_at"] = None
    resp_restore = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": tombstone, "newDocumentState": restore_state}],
    )
    body = resp_restore.json()
    assert len(body) == 1
    # Conflict carries the tombstone — restore rejected.
    assert body[0]["_deleted"] is True


async def test_admin_can_restore_soft_deleted_event(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    doc = _new_event_doc()
    master = await _push_and_pull_master(client, csrf, doc)

    # Admin soft-deletes.
    deleted_state = dict(master)
    deleted_state["_deleted"] = True
    deleted_state["deleted_at"] = "2026-04-26T13:00:00+00:00"
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": deleted_state}],
    )

    # Pull tombstone.
    pull = await client.get("/api/sync/events/pull")
    tombstone = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])

    # Admin restores: accepted.
    restore_state = dict(tombstone)
    restore_state["_deleted"] = False
    restore_state["deleted_at"] = None
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": tombstone, "newDocumentState": restore_state}],
    )
    assert resp.json() == []

    pull2 = await client.get("/api/sync/events/pull")
    after = next(d for d in pull2.json()["documents"] if d["id"] == doc["id"])
    assert after["_deleted"] is False


async def test_event_soft_delete_cascades_application_in_pull(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-030 cascade trigger soft-deletes child applications;
    sync pull then surfaces them as tombstones too."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_doc = _new_event_doc()
    event_master = await _push_and_pull_master(client, csrf, event_doc)

    app_doc = {
        "id": str(uuid.uuid4()),
        "event_id": event_doc["id"],
        "performer_id": str(user.person_id),
        "recipient_id": str(user.person_id),
        "arm_position_id": None,
        "hand_position_id": None,
        "hand_orientation_id": None,
        "sequence_no": 1,
        "started_at": "2026-04-26T12:01:00+00:00",
        "ended_at": None,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-26T12:01:00+00:00",
        "updated_at": "2026-04-26T12:01:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": None, "newDocumentState": app_doc}],
    )

    # Soft-delete the event.
    deleted = dict(event_master)
    deleted["_deleted"] = True
    deleted["deleted_at"] = "2026-04-26T13:00:00+00:00"
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": event_master, "newDocumentState": deleted}],
    )

    # Pull applications: should see the cascaded tombstone.
    apps_pull = await client.get("/api/sync/applications/pull")
    apps = apps_pull.json()["documents"]
    assert len(apps) == 1
    assert apps[0]["_deleted"] is True
