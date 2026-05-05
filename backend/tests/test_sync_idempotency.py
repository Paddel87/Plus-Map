"""Idempotency guarantees for the sync push protocol (M5b.4 / ADR-035 §D).

The frontend RxDB replication retries pushes after offline / online
flips. Re-posting the same document — first as an insert, then as the
"already accepted" update — must not duplicate rows, must not bump
``sequence_no`` again, and must not double-fire the auto-participant
trigger. These tests pin those guarantees from the backend side; the
frontend E2E test under ``frontend/tests/replication.e2e.test.ts``
covers the same property at the RxDB layer.
"""

from __future__ import annotations

import uuid

import pytest
from app.models.application import Application
from app.models.event import Event, EventParticipant
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy import func, select, text
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
        "started_at": "2026-04-27T12:00:00+00:00",
        "ended_at": None,
        "lat": 52.5,
        "lon": 13.4,
        "legacy_external_ref": None,
        "reveal_participants": False,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-27T12:00:00+00:00",
        "updated_at": "2026-04-27T12:00:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }


def _new_app_doc(
    event_id: str,
    performer_id: str,
    recipient_id: str,
    *,
    app_id: str | None = None,
    started_at: str = "2026-04-27T12:01:00+00:00",
) -> dict:
    return {
        "id": app_id or str(uuid.uuid4()),
        "event_id": event_id,
        "performer_id": performer_id,
        "recipient_id": recipient_id,
        "sequence_no": 1,
        "started_at": started_at,
        "ended_at": None,
        "note": None,
        "created_by": None,
        "created_at": started_at,
        "updated_at": started_at,
        "deleted_at": None,
        "_deleted": False,
    }


async def _count(
    factory: async_sessionmaker[AsyncSession],
    model: type,
    **filters,
) -> int:
    async with factory() as session:
        stmt = select(func.count()).select_from(model)
        for col, val in filters.items():
            stmt = stmt.where(getattr(model, col) == val)
        return int((await session.execute(stmt)).scalar_one())


async def test_three_event_pushes_with_same_id_yield_one_row(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Insert payload sent three times → exactly one event row, one participant."""
    _user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_id = str(uuid.uuid4())
    doc = _new_event_doc(event_id)

    # First push: insert. assumedMasterState is None.
    r1 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert r1.status_code == 200
    assert r1.json() == []  # accepted

    # Pull master so subsequent pushes carry the right assumedMasterState.
    pull = await client.get("/api/sync/events/pull")
    master = next(d for d in pull.json()["documents"] if d["id"] == event_id)

    # Second push with the master attached: client thinks it's still in sync.
    r2 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": master}],
    )
    assert r2.status_code == 200

    # Third push: same shape again.
    r3 = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": master, "newDocumentState": master}],
    )
    assert r3.status_code == 200

    # Database state: one event, one auto-participant (creator's person).
    events = await _count(async_session_factory, Event)
    participants = await _count(
        async_session_factory, EventParticipant, event_id=uuid.UUID(event_id)
    )
    assert events == 1, f"expected exactly one event row, got {events}"
    assert participants == 1, f"expected one auto-participant for the creator, got {participants}"


async def test_three_application_pushes_with_same_id_yield_one_row(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Mirror of the event idempotency test on the application collection."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_id = str(uuid.uuid4())
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": _new_event_doc(event_id)}],
    )

    app_id = str(uuid.uuid4())
    person_id = str(user.person_id)
    app_doc = _new_app_doc(
        event_id,
        performer_id=person_id,
        recipient_id=person_id,
        app_id=app_id,
    )

    # Three retries of the same insert.
    for _ in range(3):
        await post_with_csrf(
            client,
            csrf,
            "/api/sync/applications/push",
            json=[{"assumedMasterState": None, "newDocumentState": app_doc}],
        )

    apps = await _count(async_session_factory, Application, id=uuid.UUID(app_id))
    assert apps == 1, f"expected exactly one application row, got {apps}"

    # Pull and verify the server-vergebene sequence_no is stable across retries.
    pull = await client.get("/api/sync/applications/pull")
    docs = pull.json()["documents"]
    assert len(docs) == 1
    assert docs[0]["sequence_no"] == 1


async def test_offline_replay_three_apps_yields_three_distinct_rows(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """The Fahrplan acceptance criterion at the protocol level.

    Simulates the offline/reconnect path: the client buffers three
    applications offline, then replays them in a single push batch when
    reconnecting. Server must end up with three rows, distinct
    sequence_no, no participant duplicates.
    """
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    event_id = str(uuid.uuid4())
    await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": _new_event_doc(event_id)}],
    )

    person_id = str(user.person_id)
    apps = [
        _new_app_doc(
            event_id,
            performer_id=person_id,
            recipient_id=person_id,
            started_at=f"2026-04-27T12:0{i + 1}:00+00:00",
        )
        for i in range(3)
    ]

    # Single replay batch.
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc} for doc in apps],
    )
    assert resp.status_code == 200
    assert resp.json() == []

    # Idempotent retry of the exact batch — RxDB might re-issue under flaky
    # connectivity. No duplicates, no extra participants.
    retry = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc} for doc in apps],
    )
    assert retry.status_code == 200
    # Conflict response carries server master per ADR-029 (existing row +
    # null assumedMasterState).
    assert len(retry.json()) == 3

    rows = await _count(async_session_factory, Application)
    assert rows == 3

    # sequence_no contiguous, server-vergeben (1..3, irrespective of
    # what the client originally wrote).
    pull = await client.get("/api/sync/applications/pull")
    seq = sorted(d["sequence_no"] for d in pull.json()["documents"])
    assert seq == [1, 2, 3]

    # One participant for the creator (Performer == Recipient == own person).
    participants = await _count(
        async_session_factory, EventParticipant, event_id=uuid.UUID(event_id)
    )
    assert participants == 1
