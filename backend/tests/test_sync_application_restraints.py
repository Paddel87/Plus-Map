"""Coverage for the M7.5 restraint set on the application sync wire format.

ADR-046 §B/§C: ``equipment_item_ids`` is a denormalised array on
``ApplicationDoc``. Pull bulk-loads ``application_equipment`` rows; push
diffs the set against the table; editor pushes with non-approved ids
return a conflict instead of writing partial state. Conflict responses
carry the server-side set so the client learns the truth.
"""

from __future__ import annotations

import secrets
import uuid

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
        await session.execute(text("DELETE FROM application_equipment"))
        await session.execute(text("DELETE FROM event_participant"))
        await session.execute(text("DELETE FROM application"))
        await session.execute(text("DELETE FROM event"))
        await session.execute(text("DELETE FROM equipment_item WHERE display_name LIKE 'M7.5 %'"))


def _new_event_doc() -> dict:
    return {
        "id": str(uuid.uuid4()),
        "started_at": "2026-04-29T12:00:00+00:00",
        "ended_at": None,
        "lat": 52.5,
        "lon": 13.4,
        "legacy_external_ref": None,
        "reveal_participants": False,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-29T12:00:00+00:00",
        "updated_at": "2026-04-29T12:00:00+00:00",
        "deleted_at": None,
        "_deleted": False,
    }


def _new_app_doc(
    event_id: str,
    performer_id: str,
    recipient_id: str,
    *,
    equipment_item_ids: list[str] | None = None,
    **overrides: object,
) -> dict:
    base = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "performer_id": performer_id,
        "recipient_id": recipient_id,
        "sequence_no": 1,
        "started_at": "2026-04-29T12:01:00+00:00",
        "ended_at": None,
        "note": None,
        "created_by": None,
        "created_at": "2026-04-29T12:01:00+00:00",
        "updated_at": "2026-04-29T12:01:00+00:00",
        "deleted_at": None,
        "_deleted": False,
        "equipment_item_ids": list(equipment_item_ids or []),
    }
    base.update(overrides)
    return base


async def _seed_event(client: AsyncClient, csrf: str) -> str:
    doc = _new_event_doc()
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/events/push",
        json=[{"assumedMasterState": None, "newDocumentState": doc}],
    )
    assert resp.status_code == 200, resp.text
    return doc["id"]


async def _seed_equipment_item(
    sm: async_sessionmaker[AsyncSession],
    *,
    status: str = "approved",
    label_suffix: str = "approved",
    suggested_by: uuid.UUID | None = None,
) -> uuid.UUID:
    rt_id = uuid.uuid4()
    async with sm() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO equipment_item (id, category, brand, model, "
                "display_name, status, suggested_by) "
                "VALUES (:id, 'tools', null, :model, :name, :status, :sb)"
            ),
            {
                "id": rt_id,
                "model": f"{label_suffix}-{secrets.token_hex(3)}",
                "name": f"M7.5 {label_suffix.capitalize()} {secrets.token_hex(2)}",
                "status": status,
                "sb": suggested_by,
            },
        )
    return rt_id


async def _push_app(
    client: AsyncClient,
    csrf: str,
    doc: dict,
    master: dict | None = None,
) -> list[dict]:
    resp = await post_with_csrf(
        client,
        csrf,
        "/api/sync/applications/push",
        json=[{"assumedMasterState": master, "newDocumentState": doc}],
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list)
    return body


async def _pull_apps(client: AsyncClient) -> list[dict]:
    resp = await client.get("/api/sync/applications/pull")
    assert resp.status_code == 200, resp.text
    return resp.json()["documents"]


async def _restraint_rows(
    sm: async_sessionmaker[AsyncSession],
    application_id: str,
) -> list[uuid.UUID]:
    async with sm() as session:
        rows = (
            await session.execute(
                text(
                    "SELECT equipment_item_id FROM application_equipment "
                    "WHERE application_id = :aid"
                ),
                {"aid": application_id},
            )
        ).all()
    return sorted([row[0] for row in rows])


# --- Insert path -----------------------------------------------------------


async def test_insert_application_with_restraints_persists_set(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Editor pushes a brand new application with two approved restraints.

    Both ``application_equipment`` rows must materialise; subsequent
    pull returns the same set on the doc.
    """
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_a = await _seed_equipment_item(async_session_factory, label_suffix="rope-a")
    rt_b = await _seed_equipment_item(async_session_factory, label_suffix="rope-b")
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(rt_a), str(rt_b)],
    )
    conflicts = await _push_app(client, csrf, doc)
    assert conflicts == []

    persisted = await _restraint_rows(async_session_factory, doc["id"])
    assert persisted == sorted([rt_a, rt_b])

    after = (await _pull_apps(client))[0]
    assert sorted(after["equipment_item_ids"]) == sorted([str(rt_a), str(rt_b)])


async def test_insert_with_empty_set_is_a_no_op(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(eid, str(user.person_id), str(user.person_id))
    await _push_app(client, csrf, doc)

    persisted = await _restraint_rows(async_session_factory, doc["id"])
    assert persisted == []
    after = (await _pull_apps(client))[0]
    assert after["equipment_item_ids"] == []


# --- Update path: set replace ---------------------------------------------


async def test_update_replaces_set(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Update with a new array drops the missing element and adds the new one (LWW)."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_a = await _seed_equipment_item(async_session_factory, label_suffix="rope-a")
    rt_b = await _seed_equipment_item(async_session_factory, label_suffix="rope-b")
    rt_c = await _seed_equipment_item(async_session_factory, label_suffix="rope-c")
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(rt_a), str(rt_b)],
    )
    await _push_app(client, csrf, doc)

    master = (await _pull_apps(client))[0]
    new_state = dict(master)
    new_state["equipment_item_ids"] = [str(rt_a), str(rt_c)]
    conflicts = await _push_app(client, csrf, new_state, master=master)
    assert conflicts == []

    after = await _restraint_rows(async_session_factory, doc["id"])
    assert after == sorted([rt_a, rt_c])

    pulled = (await _pull_apps(client))[0]
    assert sorted(pulled["equipment_item_ids"]) == sorted([str(rt_a), str(rt_c)])


async def test_repeated_push_is_idempotent(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Three identical push runs keep exactly one row per (app, rt)."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_a = await _seed_equipment_item(async_session_factory, label_suffix="rope-a")
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(rt_a)],
    )
    await _push_app(client, csrf, doc)
    master = (await _pull_apps(client))[0]
    for _ in range(2):
        await _push_app(client, csrf, dict(master), master=master)

    after = await _restraint_rows(async_session_factory, doc["id"])
    assert after == [rt_a]


# --- Editor approved-check ------------------------------------------------


async def test_editor_push_with_pending_equipment_item_returns_conflict(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Editor may only link approved EquipmentItems (ADR-046 §C)."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    pending_rt = await _seed_equipment_item(
        async_session_factory,
        status="pending",
        label_suffix="pending",
        suggested_by=user.id,
    )
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(pending_rt)],
    )
    conflicts = await _push_app(client, csrf, doc)
    assert len(conflicts) == 1
    assert conflicts[0]["_deleted"] is True

    persisted = await _restraint_rows(async_session_factory, doc["id"])
    assert persisted == []


async def test_editor_update_with_pending_equipment_item_keeps_server_set(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Update path: pending in the new array → conflict, server set unchanged."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_ok = await _seed_equipment_item(async_session_factory, label_suffix="rope-ok")
    pending_rt = await _seed_equipment_item(
        async_session_factory,
        status="pending",
        label_suffix="pending",
        suggested_by=user.id,
    )
    eid = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(rt_ok)],
    )
    await _push_app(client, csrf, doc)
    master = (await _pull_apps(client))[0]

    new_state = dict(master)
    new_state["equipment_item_ids"] = [str(rt_ok), str(pending_rt)]
    conflicts = await _push_app(client, csrf, new_state, master=master)
    assert len(conflicts) == 1
    # Conflict response must carry the *server* set, not the rejected client one.
    assert sorted(conflicts[0]["equipment_item_ids"]) == [str(rt_ok)]

    persisted = await _restraint_rows(async_session_factory, doc["id"])
    assert persisted == [rt_ok]


# --- Conflict-response payload --------------------------------------------


async def test_conflict_response_carries_current_restraint_set(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Immutable-field mismatch returns the server master incl. live restraints."""
    user, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_a = await _seed_equipment_item(async_session_factory, label_suffix="rope-a")
    eid_a = await _seed_event(client, csrf)
    eid_b = await _seed_event(client, csrf)
    doc = _new_app_doc(
        eid_a,
        str(user.person_id),
        str(user.person_id),
        equipment_item_ids=[str(rt_a)],
    )
    await _push_app(client, csrf, doc)
    master = (await _pull_apps(client))[0]

    new_state = dict(master)
    new_state["event_id"] = eid_b  # immutable field, must conflict
    conflicts = await _push_app(client, csrf, new_state, master=master)
    assert len(conflicts) == 1
    assert conflicts[0]["event_id"] == eid_a
    assert sorted(conflicts[0]["equipment_item_ids"]) == [str(rt_a)]
