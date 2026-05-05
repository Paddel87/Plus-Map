"""HTTP tests for the new GET /api/events/{id}/applications endpoint (M5a.3)."""

from __future__ import annotations

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


async def _start_event(client: AsyncClient, csrf: str) -> str:
    resp = await post_with_csrf(client, csrf, "/api/events/start", json={"lat": "0", "lon": "0"})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_list_applications_returns_empty_for_new_event(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    resp = await client.get(f"/api/events/{event_id}/applications")
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


async def test_list_applications_returns_in_sequence_order(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _start_event(client, csrf)
    a1 = await post_with_csrf(client, csrf, f"/api/events/{event_id}/applications/start", json={})
    a2 = await post_with_csrf(client, csrf, f"/api/events/{event_id}/applications/start", json={})
    a3 = await post_with_csrf(client, csrf, f"/api/events/{event_id}/applications/start", json={})
    resp = await client.get(f"/api/events/{event_id}/applications")
    assert resp.status_code == 200
    body = resp.json()
    assert [item["sequence_no"] for item in body] == [1, 2, 3]
    assert [item["id"] for item in body] == [
        a1.json()["id"],
        a2.json()["id"],
        a3.json()["id"],
    ]


async def test_list_applications_unknown_event_returns_404(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, _ = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await client.get("/api/events/00000000-0000-0000-0000-000000000000/applications")
    assert resp.status_code == 404
