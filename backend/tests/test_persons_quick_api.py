"""HTTP tests for the on-the-fly person endpoint (M5a.1, ADR-014)."""

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


async def test_admin_can_quick_create_person(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/persons/quick",
        json={"name": "Admin-OnTheFly"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Admin-OnTheFly"
    assert body["origin"] == "on_the_fly"
    assert body["linkable"] is False


async def test_editor_can_quick_create_person(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/persons/quick",
        json={"name": "Editor-OnTheFly", "alias": "EOF"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["alias"] == "EOF"
    assert body["origin"] == "on_the_fly"
    assert body["linkable"] is False


async def test_viewer_blocked_from_quick_create(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.VIEWER)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/persons/quick",
        json={"name": "Forbidden"},
    )
    assert resp.status_code == 403


async def test_quick_create_ignores_attempts_to_set_linkable(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Regel-004: linkable=false is server-enforced; extra body fields are
    ignored by the schema."""
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/persons/quick",
        json={"name": "TryLink", "linkable": True},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["linkable"] is False
