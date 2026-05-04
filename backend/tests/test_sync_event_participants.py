"""Coverage for the M5c.1b event_participant pull endpoint (ADR-037).

Three areas:

1. The pull endpoint itself: cursor pagination, tombstone surfacing,
   server-vergebene id (the auto-participant trigger creates rows
   without a client-supplied id).
2. RLS: a member only sees ``event_participant`` rows for events they
   can already see — the existing ``event_participant_member_select``
   policy from M2 is reused unchanged.
3. The cascade-trigger extension from ADR-037 §C: soft-deleting an
   event tombstones its participant rows together with its
   applications, so the pull endpoint surfaces them with
   ``_deleted: true``.
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


def _new_event_doc(event_id: str | None = None) -> dict:
    return {
        "id": event_id or str(uuid.uuid4()),
        "started_at": "2026-04-27T19:00:00+00:00",
        "ended_at": None,
        "lat": 52.5,
        "lon": 13.4,
        "legacy_external_ref": None,
        "reveal_participants": False,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-27T19:00:00+00:00",
        "updated_at": "2026-04-27T19:00:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }


async def _seed_event(client: AsyncClient, csrf: str, event_id: str) -> None:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": _new_event_doc(event_id)}],
    )
    assert resp.status_code == 200, resp.text


# --- Pull edge cases --------------------------------------------------------


async def test_initial_pull_is_empty_for_clean_user(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/sync/event-participants/pull")
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == []
    assert body["checkpoint"] is None


async def test_pull_returns_auto_participant_after_event_push(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """``push_events`` triggers ``_ensure_participant`` for the creator.
    The pull endpoint must surface that auto-row with a server-vergebenen
    ``id`` and a non-null ``updated_at``."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_id = str(uuid.uuid4())
    await _seed_event(client, csrf, event_id)

    resp = await client.get("/api/sync/event-participants/pull")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["documents"]) == 1
    doc = body["documents"][0]
    assert doc["event_id"] == event_id
    assert doc["person_id"] == str(user.person_id)
    assert doc["_deleted"] is False
    # id was server-generated.
    assert uuid.UUID(doc["id"])
    assert body["checkpoint"]["id"] == doc["id"]
    assert body["checkpoint"]["updated_at"] == doc["updated_at"]


async def test_cursor_advances_across_multiple_events(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    e1, e2 = str(uuid.uuid4()), str(uuid.uuid4())
    await _seed_event(client, csrf, e1)
    await _seed_event(client, csrf, e2)

    first = await client.get("/api/sync/event-participants/pull?limit=1")
    assert first.status_code == 200
    body1 = first.json()
    assert len(body1["documents"]) == 1

    cp = body1["checkpoint"]
    second = await client.get(
        f"/api/sync/event-participants/pull?updated_at={cp['updated_at']}&id={cp['id']}",
    )
    body2 = second.json()
    assert len(body2["documents"]) == 1
    assert body2["documents"][0]["id"] != body1["documents"][0]["id"]


# --- RLS ------------------------------------------------------------------


async def test_editor_sees_only_their_own_events_participants(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """An editor must not pull ``event_participant`` rows for events
    they don't participate in. Reuses the existing RLS helper
    ``app_user_can_see_event``."""
    # Editor A creates an event (auto-participant attached).
    _, csrf_a = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_a = str(uuid.uuid4())
    await _seed_event(client, csrf_a, event_a)

    # Editor B logs in independently — should see no rows.
    _, _csrf_b = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/sync/event-participants/pull")
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == []


async def test_admin_pull_sees_all_event_participants(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_e = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_e = str(uuid.uuid4())
    await _seed_event(client, csrf_e, event_e)

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_admin = str(uuid.uuid4())
    await _seed_event(client, csrf_admin, event_admin)

    resp = await client.get("/api/sync/event-participants/pull")
    assert resp.status_code == 200
    body = resp.json()
    # Admin sees both auto-participants (one per event).
    assert len(body["documents"]) == 2


# --- Cascade trigger ------------------------------------------------------


async def test_event_soft_delete_cascades_event_participant_to_pull(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-037 §C: the cascade trigger now also tombstones the
    event_participant rows when the parent event is soft-deleted."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_id = str(uuid.uuid4())
    await _seed_event(client, csrf, event_id)

    # Pull master so we can soft-delete via push.
    pull = await client.get("/api/sync/events/pull")
    master = next(d for d in pull.json()["documents"] if d["id"] == event_id)
    deleted = dict(master)
    deleted["_deleted"] = True
    deleted["deleted_at"] = "2026-04-27T20:00:00+00:00"
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": deleted}],
    )

    # Pull participants — the row must surface as a tombstone.
    resp = await client.get("/api/sync/event-participants/pull")
    body = resp.json()
    assert len(body["documents"]) == 1
    assert body["documents"][0]["_deleted"] is True
    assert body["documents"][0]["deleted_at"] is not None
