"""Coverage for the applications sync push (insert + update + conflicts).

Mirrors the event-side tests but targets ``ApplicationDoc`` and the
application-specific service paths (sequence_no, auto-participant,
catalog validation, FWW on ended_at, soft-delete cascade tested in
test_sync_conflict_resolution).
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


def _new_event_doc() -> dict:
    return {
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


def _new_app_doc(event_id: str, performer_id: str, recipient_id: str, **overrides) -> dict:
    base = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "performer_id": performer_id,
        "recipient_id": recipient_id,
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
    base.update(overrides)
    return base


async def _seed_event(client: AsyncClient, csrf: str) -> str:
    doc = _new_event_doc()
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200
    return doc["id"]


async def _push_app(client: AsyncClient, csrf: str, doc: dict, master: dict | None = None) -> dict:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": master, "newDocumentState": doc}],
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def _pull_apps(client: AsyncClient) -> list[dict]:
    resp = await client.get("/api/sync/applications/pull")
    assert resp.status_code == 200
    return resp.json()["documents"]


# --- Pull edge cases --------------------------------------------------------


async def test_application_pull_initial_empty(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/sync/applications/pull")
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == []
    assert body["checkpoint"] is None


async def test_application_pull_cursor_advances(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    for _ in range(3):
        await _push_app(
            client,
            csrf,
            _new_app_doc(eid, str(user.person_id), str(user.person_id)),
        )

    page1 = await client.get("/api/sync/applications/pull", params={"limit": 2})
    body1 = page1.json()
    assert len(body1["documents"]) == 2
    assert body1["checkpoint"] is not None

    cp = body1["checkpoint"]
    page2 = await client.get(
        "/api/sync/applications/pull",
        params={"updated_at": cp["updated_at"], "id": cp["id"], "limit": 2},
    )
    body2 = page2.json()
    assert len(body2["documents"]) == 1


# --- Push: update path ------------------------------------------------------


async def test_application_update_lww_on_note(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    initial = _new_app_doc(eid, str(user.person_id), str(user.person_id), note="first")
    await _push_app(client, csrf, initial)

    master = (await _pull_apps(client))[0]
    new_state = dict(master)
    new_state["note"] = "updated"
    conflicts = await _push_app(client, csrf, new_state, master=master)
    assert conflicts == []

    after = (await _pull_apps(client))[0]
    assert after["note"] == "updated"


async def test_application_change_event_id_returns_conflict(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """event_id is immutable-after-create per ADR-029."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid_a = await _seed_event(client, csrf)
    eid_b = await _seed_event(client, csrf)
    initial = _new_app_doc(eid_a, str(user.person_id), str(user.person_id))
    await _push_app(client, csrf, initial)
    master = (await _pull_apps(client))[0]

    new_state = dict(master)
    new_state["event_id"] = eid_b
    conflicts = await _push_app(client, csrf, new_state, master=master)
    assert len(conflicts) == 1
    assert conflicts[0]["event_id"] == eid_a


async def test_application_first_write_wins_on_ended_at(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    initial = _new_app_doc(eid, str(user.person_id), str(user.person_id))
    await _push_app(client, csrf, initial)
    master = (await _pull_apps(client))[0]

    end_one = dict(master)
    end_one["ended_at"] = "2026-04-26T12:30:00+00:00"
    conflicts1 = await _push_app(client, csrf, end_one, master=master)
    assert conflicts1 == []

    after_first = (await _pull_apps(client))[0]
    end_two = dict(after_first)
    end_two["ended_at"] = "2026-04-26T13:00:00+00:00"
    conflicts2 = await _push_app(client, csrf, end_two, master=after_first)
    assert len(conflicts2) == 1
    assert conflicts2[0]["ended_at"].startswith("2026-04-26T12:30:00")


async def test_application_editor_cannot_restore_soft_deleted(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    initial = _new_app_doc(eid, str(user.person_id), str(user.person_id))
    await _push_app(client, csrf, initial)
    master = (await _pull_apps(client))[0]

    deleted = dict(master)
    deleted["_deleted"] = True
    deleted["deleted_at"] = "2026-04-26T13:00:00+00:00"
    conflicts_del = await _push_app(client, csrf, deleted, master=master)
    assert conflicts_del == []

    tombstone = (await _pull_apps(client))[0]
    assert tombstone["_deleted"] is True

    restore = dict(tombstone)
    restore["_deleted"] = False
    restore["deleted_at"] = None
    conflicts_restore = await _push_app(client, csrf, restore, master=tombstone)
    assert len(conflicts_restore) == 1
    assert conflicts_restore[0]["_deleted"] is True


async def test_application_assumed_state_mismatch_when_server_has_no_row(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Client thinks it's an update; server has nothing → tombstone conflict."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    fake_master = _new_app_doc(eid, str(user.person_id), str(user.person_id))
    new_state = dict(fake_master)
    new_state["note"] = "anything"
    conflicts = await _push_app(client, csrf, new_state, master=fake_master)
    assert len(conflicts) == 1
    assert conflicts[0]["_deleted"] is True
    assert conflicts[0]["id"] == fake_master["id"]


async def test_application_assumed_state_none_but_server_has_row(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Client thinks it's an insert; server already has the row → conflict
    surfaces the server master."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    initial = _new_app_doc(eid, str(user.person_id), str(user.person_id), note="server")
    await _push_app(client, csrf, initial)

    duplicate = dict(initial)
    duplicate["note"] = "client"
    conflicts = await _push_app(client, csrf, duplicate, master=None)
    assert len(conflicts) == 1
    assert conflicts[0]["note"] == "server"
    assert conflicts[0]["_deleted"] is False


async def test_event_assumed_state_mismatch_synthetic_tombstone(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Same shape on the event side: client expects an existing master, server has none."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    fake_master = _new_event_doc()
    new_state = dict(fake_master)
    new_state["note"] = "x"
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": fake_master, "newDocumentState": new_state}],
    )
    body = resp.json()
    assert len(body) == 1
    assert body[0]["_deleted"] is True
