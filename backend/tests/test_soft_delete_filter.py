"""Regression coverage for the M5b.2 soft-delete filter in non-sync routes.

Once a row carries ``is_deleted = true`` (set via the sync push, ADR-030)
the regular CRUD/search/export endpoints must treat it as absent. The
sync endpoints are the only consumer that still sees tombstones.
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


def _new_event_doc(note: str | None = None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "started_at": "2026-04-26T12:00:00+00:00",
        "ended_at": None,
        "lat": 52.5,
        "lon": 13.4,
        "legacy_external_ref": None,
        "reveal_participants": False,
        "note": note,
        "created_by": None,
        "created_at": "2026-04-26T12:00:00+00:00",
        "updated_at": "2026-04-26T12:00:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }


async def _push_and_get_id(client: AsyncClient, csrf: str, doc: dict) -> str:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200
    return doc["id"]


async def _soft_delete(client: AsyncClient, csrf: str, event_id: str) -> None:
    pull = await client.get("/api/sync/events/pull")
    master = next(d for d in pull.json()["documents"] if d["id"] == event_id)
    deleted = dict(master)
    deleted["_deleted"] = True
    deleted["deleted_at"] = "2026-04-26T13:00:00+00:00"
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": deleted}],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


async def test_soft_deleted_event_hidden_from_list(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    visible_id = await _push_and_get_id(client, csrf, _new_event_doc())
    deleted_id = await _push_and_get_id(client, csrf, _new_event_doc())
    await _soft_delete(client, csrf, deleted_id)

    resp = await client.get("/api/events")
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()["items"]}
    assert visible_id in ids
    assert deleted_id not in ids


async def test_soft_deleted_event_returns_404_via_get(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    eid = await _push_and_get_id(client, csrf, _new_event_doc())
    await _soft_delete(client, csrf, eid)

    resp = await client.get(f"/api/events/{eid}")
    assert resp.status_code == 404


async def test_soft_deleted_event_excluded_from_search(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    visible_id = await _push_and_get_id(client, csrf, _new_event_doc(note="alpha-bravo-charlie"))
    deleted_id = await _push_and_get_id(client, csrf, _new_event_doc(note="alpha-bravo-charlie"))
    await _soft_delete(client, csrf, deleted_id)

    resp = await client.get("/api/search", params={"q": "alpha-bravo-charlie"})
    assert resp.status_code == 200
    hit_ids = {h["id"] for h in resp.json()["items"]}
    assert visible_id in hit_ids
    assert deleted_id not in hit_ids


async def test_soft_deleted_event_excluded_from_json_export(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    visible_id = await _push_and_get_id(client, csrf, _new_event_doc())
    deleted_id = await _push_and_get_id(client, csrf, _new_event_doc())
    await _soft_delete(client, csrf, deleted_id)

    resp = await client.get("/api/export/me", params={"format": "json"})
    assert resp.status_code == 200
    event_ids = {e["id"] for e in resp.json()["events"]}
    assert visible_id in event_ids
    assert deleted_id not in event_ids


async def test_soft_deleted_event_still_in_sync_pull(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Sync endpoints must keep returning tombstones; verify the filter is
    only applied in the regular consumer paths."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    eid = await _push_and_get_id(client, csrf, _new_event_doc())
    await _soft_delete(client, csrf, eid)

    pull = await client.get("/api/sync/events/pull")
    docs = pull.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["id"] == eid
    assert docs[0]["_deleted"] is True
