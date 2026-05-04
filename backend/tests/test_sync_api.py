"""HTTP tests for the M5b.2 sync endpoints (happy path + cursor + tombstone)."""

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
    eid = str(uuid.uuid4())
    base = {
        "id": eid,
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


async def test_pull_events_initially_empty(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["documents"] == []
    assert body["checkpoint"] is None


async def test_push_event_inserts_and_pull_returns_it(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == []  # no conflicts

    pull = await client.get("/api/sync/events/pull")
    assert pull.status_code == 200
    body = pull.json()
    assert len(body["documents"]) == 1
    pulled = body["documents"][0]
    assert pulled["id"] == doc["id"]
    # Server overrides created_by to the authenticated user.
    assert pulled["created_by"] == str(user.id)
    # Wire-format uses _deleted (alias) — confirm shape.
    assert pulled["_deleted"] is False


async def test_pull_cursor_advances(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)

    docs = [_new_event_doc() for _ in range(3)]
    for d in docs:
        resp = await post_with_csrf(
            client,
            csrf,
            "/api/sync/events/push",
            json=[{"assumedMasterState": None, "newDocumentState": d}],
        )
        assert resp.status_code == 200

    # First pull: limit 2 → returns first two with checkpoint.
    page1 = await client.get("/api/sync/events/pull", params={"limit": 2})
    assert page1.status_code == 200
    page1_body = page1.json()
    assert len(page1_body["documents"]) == 2
    cp = page1_body["checkpoint"]
    assert cp is not None

    # Second pull from the checkpoint: returns the remaining one.
    page2 = await client.get(
        "/api/sync/events/pull",
        params={"updated_at": cp["updated_at"], "id": cp["id"], "limit": 2},
    )
    assert page2.status_code == 200
    page2_body = page2.json()
    assert len(page2_body["documents"]) == 1
    assert page2_body["documents"][0]["id"] not in {d["id"] for d in page1_body["documents"]}


async def test_push_event_soft_delete_replicates_as_tombstone(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    doc = _new_event_doc()
    insert = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert insert.status_code == 200

    # Pull current master to use as assumedMasterState.
    pull = await client.get("/api/sync/events/pull")
    master = pull.json()["documents"][0]

    deleted_doc = dict(master)
    deleted_doc["_deleted"] = True
    deleted_doc["deleted_at"] = "2026-04-26T13:00:00+00:00"

    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": deleted_doc}],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == []

    # Pull again from the very beginning — tombstone should be returned.
    refetch = await client.get("/api/sync/events/pull")
    assert refetch.status_code == 200
    docs = refetch.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["_deleted"] is True


async def test_push_application_assigns_server_sequence_no(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)

    # Insert an event first.
    event_doc = _new_event_doc()
    insert_event = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": event_doc}],
    )
    assert insert_event.status_code == 200

    # Push two applications with bogus client-side sequence_no=99 — server overrides.
    app_doc_1 = {
        "id": str(uuid.uuid4()),
        "event_id": event_doc["id"],
        "performer_id": str(user.person_id),
        "recipient_id": str(user.person_id),
        "arm_position_id": None,
        "hand_position_id": None,
        "hand_orientation_id": None,
        "sequence_no": 99,  # ignored by server
        "started_at": "2026-04-26T12:01:00+00:00",
        "ended_at": None,
        "note": "first",
        "created_by": None,
        "created_at": "2026-04-26T12:01:00+00:00",
        "updated_at": "2026-04-26T12:01:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }
    app_doc_2 = dict(app_doc_1)
    app_doc_2["id"] = str(uuid.uuid4())
    app_doc_2["sequence_no"] = 99
    app_doc_2["note"] = "second"

    resp1 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": None, "newDocumentState": app_doc_1}],
    )
    assert resp1.status_code == 200, resp1.text
    assert resp1.json() == []
    resp2 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": None, "newDocumentState": app_doc_2}],
    )
    assert resp2.status_code == 200, resp2.text
    assert resp2.json() == []

    pull = await client.get("/api/sync/applications/pull")
    docs = sorted(pull.json()["documents"], key=lambda d: d["sequence_no"])
    assert [d["sequence_no"] for d in docs] == [1, 2]


async def test_pull_requires_auth(
    client: AsyncClient,
) -> None:
    resp = await client.get("/api/sync/events/pull")
    assert resp.status_code == 401
