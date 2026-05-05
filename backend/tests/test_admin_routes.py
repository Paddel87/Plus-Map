"""Tests for /api/admin/* (M8.3, ADR-049 §E/§F/§G)."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from app.models.application import Application
from app.models.event import Event, EventParticipant
from app.models.person import Person, PersonOrigin
from app.models.user import User, UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import (
    delete_with_csrf,
    login_as,
    make_user,
    patch_with_csrf,
    post_with_csrf,
)

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _admin(
    client: AsyncClient,
    sm: async_sessionmaker[AsyncSession],
) -> tuple[User, str]:
    return await login_as(client, sm, role=UserRole.ADMIN)


async def _make_person(
    sm: async_sessionmaker[AsyncSession],
    *,
    name: str | None = None,
    linkable: bool = False,
    origin: PersonOrigin = PersonOrigin.MANAGED,
) -> Person:
    async with sm() as session, session.begin():
        person = Person(
            name=name or f"Person-{secrets.token_hex(2)}",
            linkable=linkable,
            origin=origin,
        )
        session.add(person)
        await session.flush()
        await session.refresh(person)
        session.expunge(person)
    return person


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


async def test_anonymous_get_users_returns_401(client: AsyncClient) -> None:
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 401


async def test_editor_get_users_returns_403(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Users CRUD
# ---------------------------------------------------------------------------


async def test_admin_can_list_users(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _admin(client, async_session_factory)
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["total"] >= 1


async def test_admin_create_user_with_existing_linkable_person(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    person = await _make_person(async_session_factory, linkable=True)

    body = {
        "email": f"u{secrets.token_hex(4)}@example.com",
        "password": "ASuperSecret-Pwd-12",
        "role": "editor",
        "existing_person_id": str(person.id),
    }
    resp = await post_with_csrf(client, csrf, "/api/admin/users", json=body)
    assert resp.status_code == 201, resp.text
    assert resp.json()["person_id"] == str(person.id)


async def test_admin_create_user_rejects_non_linkable_person(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    person = await _make_person(async_session_factory, linkable=False)
    body = {
        "email": f"u{secrets.token_hex(4)}@example.com",
        "password": "ASuperSecret-Pwd-12",
        "role": "editor",
        "existing_person_id": str(person.id),
    }
    resp = await post_with_csrf(client, csrf, "/api/admin/users", json=body)
    assert resp.status_code == 409
    assert "linkable" in resp.text.lower()


async def test_admin_create_user_with_new_person(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    body = {
        "email": f"u{secrets.token_hex(4)}@example.com",
        "password": "ASuperSecret-Pwd-12",
        "role": "viewer",
        "new_person": {"name": "Newly Created Person"},
    }
    resp = await post_with_csrf(client, csrf, "/api/admin/users", json=body)
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == "viewer"


async def test_admin_create_user_requires_exactly_one_person_source(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    body = {
        "email": f"u{secrets.token_hex(4)}@example.com",
        "password": "ASuperSecret-Pwd-12",
        "role": "editor",
    }
    resp = await post_with_csrf(client, csrf, "/api/admin/users", json=body)
    assert resp.status_code == 422


async def test_admin_create_user_existing_person_not_found(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    body = {
        "email": f"u{secrets.token_hex(4)}@example.com",
        "password": "ASuperSecret-Pwd-12",
        "role": "editor",
        "existing_person_id": str(uuid.uuid4()),
    }
    resp = await post_with_csrf(client, csrf, "/api/admin/users", json=body)
    assert resp.status_code == 404


async def test_admin_patch_user_role(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    target, _, _ = await make_user(async_session_factory, role=UserRole.VIEWER)
    resp = await patch_with_csrf(
        client, csrf, f"/api/admin/users/{target.id}", json={"role": "editor"}
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"


async def test_admin_delete_deactivates_user(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    target, _, _ = await make_user(async_session_factory, role=UserRole.VIEWER)
    resp = await delete_with_csrf(client, csrf, f"/api/admin/users/{target.id}")
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


async def test_admin_cannot_delete_self(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    actor, csrf = await _admin(client, async_session_factory)
    resp = await delete_with_csrf(client, csrf, f"/api/admin/users/{actor.id}")
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Person merge
# ---------------------------------------------------------------------------


async def _add_event_for(
    sm: async_sessionmaker[AsyncSession],
    *,
    creator_id: uuid.UUID,
    participant_ids: list[uuid.UUID],
) -> Event:
    async with sm() as session, session.begin():
        ev = Event(
            started_at=datetime.now(tz=UTC),
            lat=Decimal("48.000000"),
            lon=Decimal("11.000000"),
            created_by=creator_id,
            updated_at=datetime.now(tz=UTC),
        )
        session.add(ev)
        await session.flush()
        for pid in participant_ids:
            session.add(
                EventParticipant(event_id=ev.id, person_id=pid, updated_at=datetime.now(tz=UTC))
            )
        await session.flush()
        await session.refresh(ev)
        session.expunge(ev)
    return ev


async def _add_application(
    sm: async_sessionmaker[AsyncSession],
    *,
    event_id: uuid.UUID,
    performer_id: uuid.UUID,
    recipient_id: uuid.UUID,
    creator_id: uuid.UUID,
    seq: int = 1,
) -> Application:
    async with sm() as session, session.begin():
        app = Application(
            event_id=event_id,
            performer_id=performer_id,
            recipient_id=recipient_id,
            sequence_no=seq,
            started_at=datetime.now(tz=UTC),
            ended_at=datetime.now(tz=UTC) + timedelta(minutes=5),
            created_by=creator_id,
            updated_at=datetime.now(tz=UTC),
        )
        session.add(app)
        await session.flush()
        await session.refresh(app)
        session.expunge(app)
    return app


async def test_merge_repoints_applications_and_participants(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    actor, csrf = await _admin(client, async_session_factory)
    source = await _make_person(async_session_factory)
    target = await _make_person(async_session_factory)

    ev = await _add_event_for(
        async_session_factory, creator_id=actor.id, participant_ids=[source.id]
    )
    await _add_application(
        async_session_factory,
        event_id=ev.id,
        performer_id=actor.person_id,
        recipient_id=source.id,
        creator_id=actor.id,
    )

    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/admin/persons/{source.id}/merge",
        json={"target_id": str(target.id)},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["affected_event_participants"] == 1
    assert body["affected_applications_recipient"] == 1
    assert body["affected_applications_performer"] == 0


async def test_merge_resolves_event_participant_unique_collision(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    actor, csrf = await _admin(client, async_session_factory)
    source = await _make_person(async_session_factory)
    target = await _make_person(async_session_factory)

    # Both persons participate in the same event => UNIQUE collision on
    # (event_id, person_id) when re-pointing source -> target.
    await _add_event_for(
        async_session_factory,
        creator_id=actor.id,
        participant_ids=[source.id, target.id],
    )

    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/admin/persons/{source.id}/merge",
        json={"target_id": str(target.id)},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["deleted_event_participants"] == 1
    assert body["affected_event_participants"] == 0


async def test_merge_rejects_user_linked_person(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    actor, csrf = await _admin(client, async_session_factory)
    # actor.person_id is already linked to actor (the current admin).
    target = await _make_person(async_session_factory)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/admin/persons/{actor.person_id}/merge",
        json={"target_id": str(target.id)},
    )
    assert resp.status_code == 409
    assert "user" in resp.text.lower()


async def test_merge_rejects_source_equals_target(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    p = await _make_person(async_session_factory)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/admin/persons/{p.id}/merge",
        json={"target_id": str(p.id)},
    )
    assert resp.status_code == 409


async def test_merge_rejects_unknown_source(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    _, csrf = await _admin(client, async_session_factory)
    target = await _make_person(async_session_factory)
    resp = await post_with_csrf(
        client,
        csrf,
        f"/api/admin/persons/{uuid.uuid4()}/merge",
        json={"target_id": str(target.id)},
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


async def test_admin_stats_shape(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _admin(client, async_session_factory)
    resp = await client.get("/api/admin/stats")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in [
        "events_total",
        "events_per_month_last_12",
        "top_equipment",
        "users_by_role",
        "persons_total",
        "persons_on_the_fly_unlinked",
        "pending_catalog_proposals",
    ]:
        assert key in body, key
    assert body["users_by_role"]["admin"] >= 1


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


async def test_admin_export_all_returns_full_payload(
    client: AsyncClient, async_session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await _admin(client, async_session_factory)
    resp = await client.get("/api/admin/export/all")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in [
        "exported_at",
        "schema_version",
        "users",
        "persons",
        "events",
        "applications",
        "event_participants",
        "application_equipment",
        "equipment_items",
    ]:
        assert key in body, key
    assert body["schema_version"] == 1
    # Hashed password must never escape the export boundary.
    for u in body["users"]:
        assert "hashed_password" not in u
