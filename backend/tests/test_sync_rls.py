"""RLS coverage for the M5b.2 sync endpoints.

Tests admin/editor/viewer in both directions (pull, push) and verifies
the policies bring back exactly what each role is allowed to see/modify.
RLS policies live in M2's strict-RLS migration plus the M5b.2
``editor_select_own`` additions.
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
        await session.execute(text("DELETE FROM application_equipment"))
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


# --- Pull -------------------------------------------------------------------


async def test_admin_pull_sees_all_events(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    # Editor #1 inserts one event.
    _, csrf1 = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc1 = _new_event_doc()
    await post_with_csrf(
        client,
        csrf1,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc1}],
    )

    # Admin pulls — must see editor's event even without participant link.
    _, _ = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 200
    ids = {d["id"] for d in resp.json()["documents"]}
    assert doc1["id"] in ids


async def test_editor_pull_sees_only_own_events(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    # Editor #1 creates one event.
    _, csrf1 = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc1 = _new_event_doc()
    await post_with_csrf(
        client,
        csrf1,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc1}],
    )

    # Editor #2 logs in fresh and pulls — should see nothing.
    _, _ = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 200
    ids = {d["id"] for d in resp.json()["documents"]}
    assert doc1["id"] not in ids


async def test_viewer_pull_only_sees_participant_events(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_e = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    await post_with_csrf(
        client,
        csrf_e,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )

    # Viewer logs in: not participant, should see nothing.
    _, _ = await login_as(client, async_session_factory, role=UserRole.VIEWER)
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 200
    assert all(d["id"] != doc["id"] for d in resp.json()["documents"])


# --- Push -------------------------------------------------------------------


async def test_editor_cannot_push_event_owned_by_someone_else(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """If newDocumentState.created_by is forged, server still writes its own
    user.id (server-authoritative per ADR-029). Editor can never inject
    rows attributed to a different user."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    forged_owner = str(uuid.uuid4())
    doc = _new_event_doc(created_by=forged_owner)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200
    # No conflict because the insert succeeded — but with the *real* user.
    assert resp.json() == []
    pull = await client.get("/api/sync/events/pull")
    pulled = next(d for d in pull.json()["documents"] if d["id"] == doc["id"])
    assert pulled["created_by"] == str(user.id)
    assert pulled["created_by"] != forged_owner


async def test_viewer_push_event_returns_tombstone_conflict(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Viewers have no INSERT policy on event → insert fails RLS, server
    returns a synthetic-tombstone conflict so the client stops retrying."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.VIEWER)
    doc = _new_event_doc()
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == doc["id"]
    assert body[0]["_deleted"] is True


async def test_editor_cannot_modify_other_editors_event(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Editor #1 creates, Editor #2 tries to push update — RLS rejects."""
    _, csrf1 = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    await post_with_csrf(
        client,
        csrf1,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    pull1 = await client.get("/api/sync/events/pull")
    master = pull1.json()["documents"][0]

    # Switch session to a fresh editor.
    _, csrf2 = await login_as(client, async_session_factory, role=UserRole.EDITOR)

    # Editor #2 isn't a participant and didn't create the event → can't see it.
    pull2 = await client.get("/api/sync/events/pull")
    assert all(d["id"] != doc["id"] for d in pull2.json()["documents"])

    # Editor #2 tries to push an update. Because the row is invisible from
    # their session, the service falls into the insert path and the unique
    # PK conflict surfaces as a tombstone.
    new_state = dict(master)
    new_state["note"] = "hijacked"
    resp = await post_with_csrf(
        client,
        csrf2,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": new_state}],
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    # Tombstone conflict: the editor cannot see the original row.
    assert body[0]["_deleted"] is True


async def test_pull_csrf_not_required_get(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    # No X-CSRF-Token header, but it's a GET — must succeed.
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 200


async def test_push_without_csrf_is_403(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.post(
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": _new_event_doc()}],
    )
    assert resp.status_code == 403
