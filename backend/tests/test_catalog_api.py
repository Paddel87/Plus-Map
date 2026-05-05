"""HTTP tests for the catalog router (Fahrplan: M3 DoD)."""

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
        await session.execute(text("DELETE FROM application_restraint"))
        await session.execute(text("DELETE FROM restraint_type WHERE display_name LIKE 'Test-%'"))


async def test_editor_proposes_restraint_type_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/restraint-types",
        json={
            "category": "rope",
            "display_name": "Test-Hanfseil",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "pending"


async def test_admin_approves_restraint_type(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    create = await post_with_csrf(
        client,
        csrf_editor,
        "/api/restraint-types",
        json={
            "category": "tape",
            "display_name": "Test-Bondage-Tape",
        },
    )
    rt_id = create.json()["id"]

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    approve = await post_with_csrf(client, csrf_admin, f"/api/restraint-types/{rt_id}/approve")
    assert approve.status_code == 200, approve.text
    assert approve.json()["status"] == "approved"


