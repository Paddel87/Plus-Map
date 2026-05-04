"""HTTP tests for the M7.1 catalog workflow (Fahrplan: M7.1 DoD).

Covers reject + withdraw + admin-update + UNIQUE-conflict + status-filter
on the RestraintType catalog. ``test_catalog_api.py`` keeps the M3
propose/approve happy path; this file focuses on the M7.1 additions.
"""

from __future__ import annotations

import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import (
    delete_with_csrf,
    login,
    login_as,
    make_user,
    patch_with_csrf,
    post_with_csrf,
)


@pytest.fixture(autouse=True)
async def _clean(async_session_factory: async_sessionmaker[AsyncSession]):
    yield
    async with async_session_factory() as session, session.begin():
        await session.execute(text("DELETE FROM application_restraint"))
        await session.execute(text("DELETE FROM restraint_type WHERE display_name LIKE 'M7-%'"))


# --- helpers --------------------------------------------------------------


async def _propose_restraint_type(
    client: AsyncClient,
    csrf: str,
    *,
    display_name: str,
    category: str = "rope",
    brand: str | None = None,
    model: str | None = None,
) -> str:
    # The RestraintType identity tuple is (category, brand, model,
    # mechanical_type). Default the model to the display_name so two
    # bare-bones proposals don't collide on (rope, NULL, NULL, NULL).
    body: dict[str, str | None] = {
        "category": category,
        "display_name": display_name,
        "model": model if model is not None else display_name,
    }
    if brand is not None:
        body["brand"] = brand
    resp = await post_with_csrf(client, csrf, "/api/restraint-types", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# --- Admin auto-approve on create -----------------------------------------


async def test_admin_create_restraint_type_directly_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-042 §F: Admin-POST creates an entry with status='approved'."""
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        "/api/restraint-types",
        json={"category": "rope", "display_name": "M7-AdminRT-Approved"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "approved"
    assert body["approved_by"] is not None
    assert body["suggested_by"] is None


# --- Reject ---------------------------------------------------------------


async def test_admin_rejects_with_reason(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Reject-Cand")

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{entry_id}/reject",
        json={"reason": "duplicate of existing entry"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "rejected"
    assert body["reject_reason"] == "duplicate of existing entry"
    assert body["rejected_by"] is not None
    assert body["rejected_at"] is not None


async def test_admin_rejects_requires_non_empty_reason(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Reject-NoReason")

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client, csrf_admin, f"/api/restraint-types/{entry_id}/reject", json={"reason": ""}
    )
    assert resp.status_code == 422, resp.text


async def test_editor_cannot_reject(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf, display_name="M7-Reject-Editor")
    resp = await post_with_csrf(
        client, csrf, f"/api/restraint-types/{entry_id}/reject", json={"reason": "x"}
    )
    assert resp.status_code == 403, resp.text


async def test_cannot_reject_already_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Reject-Approved")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/restraint-types/{entry_id}/approve")
    assert appr.status_code == 200
    resp = await post_with_csrf(
        client, csrf_admin, f"/api/restraint-types/{entry_id}/reject", json={"reason": "late"}
    )
    assert resp.status_code == 409, resp.text


async def test_admin_rejects_restraint_type(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-RT-RejectMe")

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{rt_id}/reject",
        json={"reason": "RT-rejection-reason"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"


# --- Withdraw -------------------------------------------------------------


async def test_editor_withdraws_own_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf, display_name="M7-Withdraw-Own")
    resp = await delete_with_csrf(client, csrf, f"/api/restraint-types/{entry_id}")
    assert resp.status_code == 204, resp.text
    listing = await client.get("/api/restraint-types")
    ids = {item["id"] for item in listing.json()["items"]}
    assert entry_id not in ids


async def test_editor_cannot_withdraw_foreign_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, _email_a, _password_a = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_a = await login(client, _email_a, _password_a)
    entry_id = await _propose_restraint_type(client, csrf_a, display_name="M7-Withdraw-Foreign")
    await client.post("/api/auth/logout")
    _, csrf_b = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    # Foreign editor sees no pending FK so the row appears "missing" from
    # their RLS view → 404.
    resp = await delete_with_csrf(client, csrf_b, f"/api/restraint-types/{entry_id}")
    assert resp.status_code == 404, resp.text


async def test_editor_cannot_withdraw_own_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_editor = await login(client, email, password)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Withdraw-Rejected")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{entry_id}/reject",
        json={"reason": "x"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    csrf_editor = await login(client, email, password)
    resp = await delete_with_csrf(client, csrf_editor, f"/api/restraint-types/{entry_id}")
    assert resp.status_code == 409, resp.text


async def test_admin_can_withdraw_any_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Withdraw-AdminAny")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await delete_with_csrf(client, csrf_admin, f"/api/restraint-types/{entry_id}")
    assert resp.status_code == 204, resp.text


async def test_admin_cannot_withdraw_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Withdraw-Approved")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/restraint-types/{entry_id}/approve")
    assert appr.status_code == 200
    resp = await delete_with_csrf(client, csrf_admin, f"/api/restraint-types/{entry_id}")
    assert resp.status_code == 409, resp.text


# --- Admin update ---------------------------------------------------------


async def test_admin_updates_restraint_type_all_fields(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_id = await _propose_restraint_type(
        client, csrf_editor, display_name="M7-RT-Update-Old", category="rope"
    )
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await patch_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{rt_id}",
        json={
            "category": "tape",
            "display_name": "M7-RT-Update-New",
            "brand": "ACME",
            "note": "edited",
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["category"] == "tape"
    assert body["display_name"] == "M7-RT-Update-New"
    assert body["brand"] == "ACME"
    assert body["note"] == "edited"


async def test_admin_update_unique_conflict_returns_409(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """RestraintType identity is (category, brand, model, mechanical_type)."""
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    first_id = await _propose_restraint_type(
        client, csrf_editor, display_name="M7-Conflict-First", brand="ACME", model="One"
    )
    second_id = await _propose_restraint_type(
        client, csrf_editor, display_name="M7-Conflict-Second", brand="ACME", model="Two"
    )
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await patch_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{second_id}",
        json={"model": "One"},
    )
    assert resp.status_code == 409, resp.text
    assert "conflict" in resp.json()["detail"].lower()
    listing = await client.get("/api/restraint-types")
    ids = {item["id"] for item in listing.json()["items"]}
    assert first_id in ids


async def test_editor_cannot_patch(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Editor-Patch")
    resp = await patch_with_csrf(
        client,
        csrf_editor,
        f"/api/restraint-types/{entry_id}",
        json={"display_name": "M7-Foo"},
    )
    assert resp.status_code == 403, resp.text


# --- Status filter --------------------------------------------------------


async def test_listing_status_filter(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    pending_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Filter-Pending")
    approved_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Filter-Approved")
    rejected_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-Filter-Rejected")
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/restraint-types/{approved_id}/approve")
    assert appr.status_code == 200
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{rejected_id}/reject",
        json={"reason": "filter test"},
    )
    assert rej.status_code == 200

    for status_value, expected in (
        ("pending", pending_id),
        ("approved", approved_id),
        ("rejected", rejected_id),
    ):
        resp = await client.get(f"/api/restraint-types?status={status_value}")
        assert resp.status_code == 200, resp.text
        ids = {item["id"] for item in resp.json()["items"]}
        m7_ids = {pending_id, approved_id, rejected_id}
        assert (ids & m7_ids) == {expected}


async def test_editor_sees_own_rejected_in_listing(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Proposing editor must keep visibility of own rejected entry."""
    _, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_editor = await login(client, email, password)
    entry_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-OwnRejectedVis")
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{entry_id}/reject",
        json={"reason": "see-me"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    csrf_editor = await login(client, email, password)
    resp = await client.get("/api/restraint-types?status=rejected")
    assert resp.status_code == 200
    items = resp.json()["items"]
    own = [i for i in items if i["id"] == entry_id]
    assert len(own) == 1
    assert own[0]["reject_reason"] == "see-me"


async def test_other_editor_cannot_see_foreign_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email_a, password_a = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_a = await login(client, email_a, password_a)
    entry_id = await _propose_restraint_type(client, csrf_a, display_name="M7-ForeignRejected")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{entry_id}/reject",
        json={"reason": "secret"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    _, _csrf_b = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/restraint-types?status=rejected")
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()["items"]}
    assert entry_id not in ids
