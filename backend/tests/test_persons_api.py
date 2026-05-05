"""HTTP tests for the Persons router (Fahrplan: M3 DoD)."""

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


async def test_admin_creates_person(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(client, csrf, "/api/persons", json={"name": "New Person"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "New Person"
    assert body["origin"] == "managed"


async def test_editor_cannot_create_person(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await post_with_csrf(client, csrf, "/api/persons", json={"name": "Forbidden"})
    assert resp.status_code == 403


async def test_anonymize_replaces_name_and_sets_deleted(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    create = await post_with_csrf(
        client,
        csrf,
        "/api/persons",
        json={"name": "Outgoing", "alias": "X", "note": "leaves group"},
    )
    person_id = create.json()["id"]
    resp = await post_with_csrf(client, csrf, f"/api/persons/{person_id}/anonymize")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "[gelöscht]"
    assert body["alias"] is None
    assert body["note"] is None
    assert body["is_deleted"] is True
    assert body["deleted_at"] is not None


async def test_event_with_reveal_false_masks_other_participant(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Editor sees [verborgen] for a co-participant when reveal_participants=false.

    Setup: admin creates an event with reveal_participants=false plus an
    application, which auto-adds a second person. Editor (with their own
    person added as participant manually) requests the detail view and
    expects the *other* person's name masked but their own visible.
    """
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    # Editor with a fresh person
    editor, _csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    # Login back as admin to set up the event.
    await client.post("/api/auth/logout")
    _admin, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    other_person = await client.post(
        "/api/persons",
        json={"name": "Co-Participant"},
        headers={"X-CSRF-Token": csrf_admin},
    )
    other_id = other_person.json()["id"]

    create_event = await post_with_csrf(
        client,
        csrf_admin,
        "/api/events",
        json={
            "started_at": datetime.now(tz=UTC).isoformat(),
            "lat": "0",
            "lon": "0",
            "reveal_participants": False,
        },
    )
    event_id = create_event.json()["id"]
    # Add editor.person and other_person as participants.
    await post_with_csrf(
        client,
        csrf_admin,
        f"/api/events/{event_id}/participants?person_id={editor.person_id}",
    )
    await post_with_csrf(
        client,
        csrf_admin,
        f"/api/events/{event_id}/participants?person_id={other_id}",
    )

    # Now log in as editor and look at the event.
    await client.post("/api/auth/logout")
    await _login_as(client, async_session_factory, editor)

    resp = await client.get(f"/api/events/{event_id}")
    assert resp.status_code == 200, resp.text
    participants = resp.json()["participants"]
    by_id = {p["id"]: p for p in participants}
    # Editor sees their own real name.
    assert by_id[str(editor.person_id)]["name"] != "[verborgen]"
    # Co-participant is masked because reveal_participants=false.
    assert by_id[other_id]["name"] == "[verborgen]"


async def _login_as(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
    user,
) -> str:
    """Re-login an existing user (helper for tests that switch roles)."""
    from app.auth.manager import _password_helper
    from app.models.user import User
    from sqlalchemy import select

    helper = _password_helper()
    async with async_session_factory() as session:
        u = (await session.execute(select(User).where(User.id == user.id))).scalar_one()
        # Reset password to a known value so we can log back in.
        u.hashed_password = helper.hash("TestPassword-12chars")
        await session.commit()

    resp = await client.post(
        "/api/auth/login",
        data={"username": user.email, "password": "TestPassword-12chars"},
    )
    assert resp.status_code == 204
    return resp.cookies["hcmap_csrf"]
