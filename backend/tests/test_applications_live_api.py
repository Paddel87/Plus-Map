"""HTTP tests for the Applications Live-mode endpoints (M5a.1)."""

from __future__ import annotations

from datetime import UTC, datetime

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


async def _make_person(async_session_factory: async_sessionmaker[AsyncSession], name: str) -> str:
    from app.models.base import uuid7

    pid = uuid7()
    async with async_session_factory() as session, session.begin():
        await session.execute(
            text("INSERT INTO person (id, name) VALUES (:id, :n)"),
            {"id": pid, "n": name},
        )
    return str(pid)


async def _start_event(client: AsyncClient, csrf: str) -> str:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/events/start",
        json={"lat": "0", "lon": "0"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_start_application_sets_started_at_and_sequence_no(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    recipient_id = await _make_person(async_session_factory, "AppRecipient")
    before = datetime.now(tz=UTC)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={"recipient_id": recipient_id},
    )
    after = datetime.now(tz=UTC)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["sequence_no"] == 1
    assert body["ended_at"] is None
    started = datetime.fromisoformat(body["started_at"])
    assert before <= started <= after
    # Default performer is the requesting user (Regel-002).
    assert body["performer_id"] == str(user.person_id)
    assert body["recipient_id"] == recipient_id


async def test_start_application_defaults_to_self_bondage_without_recipient(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["performer_id"] == str(user.person_id)
    assert body["recipient_id"] == str(user.person_id)


async def test_start_application_increments_sequence(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    first = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={},
    )
    second = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={},
    )
    assert first.json()["sequence_no"] == 1
    assert second.json()["sequence_no"] == 2


async def test_end_application_sets_ended_at(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    start = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={},
    )
    app_id = start.json()["id"]
    end = await post_with_csrf(client, csrf, f"/api/applications/{app_id}/end")
    assert end.status_code == 200, end.text
    assert end.json()["ended_at"] is not None


async def test_end_application_idempotent(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    start = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={},
    )
    app_id = start.json()["id"]
    first = await post_with_csrf(client, csrf, f"/api/applications/{app_id}/end")
    second = await post_with_csrf(client, csrf, f"/api/applications/{app_id}/end")
    assert first.json()["ended_at"] == second.json()["ended_at"]


async def test_auto_participant_when_recipient_supplied(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-012: recipient becomes participant of the event."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    recipient_id = await _make_person(async_session_factory, "AutoPart")
    await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications/start",
        json={"recipient_id": recipient_id},
    )
    detail = await client.get(f"/api/events/{event_id}")
    pids = {p["id"] for p in detail.json()["participants"]}
    assert str(user.person_id) in pids
    assert recipient_id in pids
