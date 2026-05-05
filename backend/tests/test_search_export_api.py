"""HTTP tests for search, throwbacks, exports (Fahrplan: M3 DoD)."""

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
        await session.execute(text("DELETE FROM application_equipment"))
        await session.execute(text("DELETE FROM application"))
        await session.execute(text("DELETE FROM event"))


async def _create_event(
    client: AsyncClient, csrf: str, *, note: str, lat: str = "0", lon: str = "0"
) -> str:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": lat,
            "lon": lon,
            "note": note,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_search_finds_event_by_german_keyword(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    await _create_event(client, csrf, note="Hanfseil und Lederriemen kombiniert")
    await _create_event(client, csrf, note="Anderes Material")

    resp = await client.get("/api/search?q=Hanfseil")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    hit = body["items"][0]
    assert hit["type"] == "event"
    assert "Hanfseil" in hit["snippet"] or "<b>" in hit["snippet"]


async def test_throwbacks_today(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, _csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    today = datetime.now(tz=UTC)
    last_year = today.replace(year=today.year - 1)
    # Insert directly via DB so we can pre-date the started_at.
    async with async_session_factory() as session, session.begin():
        from app.models.base import uuid7

        await session.execute(
            text("INSERT INTO event (id, started_at, lat, lon) VALUES (:id, :ts, 0, 0)"),
            {"id": uuid7(), "ts": last_year},
        )

    resp = await client.get("/api/throwbacks/today")
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert any(item["years_ago"] >= 1 for item in items)


async def test_export_me_json(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    await _create_event(client, csrf, note="Export-Probe")

    resp = await client.get("/api/export/me")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["version"] == "1"
    assert any(e.get("note") == "Export-Probe" for e in body["events"])


async def test_export_me_events_csv(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    await _create_event(client, csrf, note="CSV row")

    resp = await client.get("/api/export/me/events.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    body = resp.text
    assert body.startswith("id,started_at,ended_at")
    assert "CSV row" in body


async def test_admin_export_all_requires_admin(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, _csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/admin/export/all")
    assert resp.status_code == 403
