"""HTTP tests for the Applications router (Fahrplan: M3 DoD)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy import text
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
    async with async_session_factory() as session, session.begin():
        await session.execute(text("DELETE FROM event_participant"))
        await session.execute(text("DELETE FROM application_equipment"))
        await session.execute(text("DELETE FROM application"))
        await session.execute(text("DELETE FROM event"))


async def _make_event(client: AsyncClient, csrf: str) -> str:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": "0",
            "lon": "0",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _make_person(async_session_factory: async_sessionmaker[AsyncSession], name: str) -> str:
    """Create a managed person directly via DB so tests don't need admin
    HTTP just to set up fixtures."""
    from app.models.base import uuid7

    pid = uuid7()
    async with async_session_factory() as session, session.begin():
        await session.execute(
            text("INSERT INTO person (id, name) VALUES (:id, :n)"),
            {"id": pid, "n": name},
        )
    return str(pid)


async def test_create_application_assigns_sequence_no(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _make_event(client, csrf)
    recipient_id = await _make_person(async_session_factory, "Recipient")

    payload = {
        "performer_id": str(user.person_id),
        "recipient_id": recipient_id,
    }
    first = await post_with_csrf(client, csrf, f"/api/events/{event_id}/applications", json=payload)
    second = await post_with_csrf(
        client, csrf, f"/api/events/{event_id}/applications", json=payload
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["sequence_no"] == 1
    assert second.json()["sequence_no"] == 2


async def test_auto_participant_inserts_performer_and_recipient(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _make_event(client, csrf)
    recipient_id = await _make_person(async_session_factory, "Recipient2")

    await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications",
        json={
            "performer_id": str(user.person_id),
            "recipient_id": recipient_id,
        },
    )
    detail = await client.get(f"/api/events/{event_id}")
    person_ids = {p["id"] for p in detail.json()["participants"]}
    assert str(user.person_id) in person_ids
    assert recipient_id in person_ids


async def test_strict_mode_rejects_self_bondage(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _make_event(client, csrf)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications?strict=true",
        json={
            "performer_id": str(user.person_id),
            "recipient_id": str(user.person_id),
        },
    )
    assert resp.status_code == 422


async def test_default_mode_allows_self_bondage(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _make_event(client, csrf)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications",
        json={
            "performer_id": str(user.person_id),
            "recipient_id": str(user.person_id),
        },
    )
    assert resp.status_code == 201


async def test_patch_and_delete_application(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    event_id = await _make_event(client, csrf)
    recipient_id = await _make_person(async_session_factory, "Recipient3")
    create = await post_with_csrf(
        client,
        csrf,
        f"/api/events/{event_id}/applications",
        json={
            "performer_id": str(user.person_id),
            "recipient_id": recipient_id,
        },
    )
    app_id = create.json()["id"]
    patched = await patch_with_csrf(
        client, csrf, f"/api/applications/{app_id}", json={"note": "hello"}
    )
    assert patched.status_code == 200
    assert patched.json()["note"] == "hello"

    deleted = await delete_with_csrf(client, csrf, f"/api/applications/{app_id}")
    assert deleted.status_code == 204
