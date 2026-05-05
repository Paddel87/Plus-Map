"""HTTP tests for the Events router (Fahrplan: M3 DoD)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import (
    delete_with_csrf,
    login_as,
    patch_with_csrf,
    post_with_csrf,
)


@pytest.fixture(autouse=True)
async def _clean(async_session_factory: async_sessionmaker[AsyncSession]):
    yield
    # Tests share a Postgres test DB; clean events between tests so totals
    # stay deterministic. user/person rows are kept (login state).
    async with async_session_factory() as session, session.begin():
        from sqlalchemy import text

        await session.execute(text("DELETE FROM event_participant"))
        await session.execute(text("DELETE FROM application_equipment"))
        await session.execute(text("DELETE FROM application"))
        await session.execute(text("DELETE FROM event"))


async def test_create_event_returns_plus_code_and_creator_as_participant(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    body = {
        "started_at": datetime.now(tz=UTC).isoformat(),
        "lat": "52.520008",
        "lon": "13.404954",
        "reveal_participants": True,
    }
    resp = await post_with_csrf(client, csrf, "/api/events", json=body)
    assert resp.status_code == 201, resp.text
    detail = resp.json()
    assert detail["plus_code"].startswith("9F4MG")  # Berlin Plus-Code prefix
    assert len(detail["participants"]) == 1
    assert detail["participants"][0]["id"] == str(user.person_id)


async def test_list_events_paginated(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    for _ in range(3):
        await post_with_csrf(
            client,
            csrf,
            "/api/events",
            json={
                "started_at": datetime.now(tz=UTC).isoformat(),
                "lat": "0",
                "lon": "0",
            },
        )
    resp = await client.get("/api/events?limit=2&offset=0")
    assert resp.status_code == 200, resp.text
    page = resp.json()
    assert page["total"] == 3
    assert page["limit"] == 2
    assert len(page["items"]) == 2


async def test_patch_event_updates_note(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    create = await post_with_csrf(
        client,
        csrf,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": "10",
            "lon": "20",
        },
    )
    event_id = create.json()["id"]
    resp = await patch_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}",
        json={"note": "first session"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["note"] == "first session"


async def test_delete_event_returns_204(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    create = await post_with_csrf(
        client,
        csrf,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": "0",
            "lon": "0",
        },
    )
    event_id = create.json()["id"]
    resp = await delete_with_csrf(client, csrf, f"/api/events/{event_id}")
    assert resp.status_code == 204
    follow = await client.get(f"/api/events/{event_id}")
    assert follow.status_code == 404


async def test_lat_out_of_range_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": "95",
            "lon": "0",
        },
    )
    assert resp.status_code == 422
