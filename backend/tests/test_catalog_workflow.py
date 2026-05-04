"""HTTP tests for the M7.1 catalog workflow (Fahrplan: M7.1 DoD).

Covers reject + withdraw + admin-update + UNIQUE-conflict + status-filter
across the four catalog endpoints. ``test_catalog_api.py`` keeps the
M3 propose/approve happy path; this file focuses on the M7.1 additions.
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
        await session.execute(text("DELETE FROM arm_position WHERE name LIKE 'M7-%'"))
        await session.execute(text("DELETE FROM hand_position WHERE name LIKE 'M7-%'"))
        await session.execute(text("DELETE FROM hand_orientation WHERE name LIKE 'M7-%'"))


# --- helpers --------------------------------------------------------------


async def _propose_arm_position(
    client: AsyncClient,
    csrf: str,
    *,
    name: str,
) -> str:
    resp = await post_with_csrf(client, csrf, "/api/arm-positions", json={"name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _propose_restraint_type(
    client: AsyncClient,
    csrf: str,
    *,
    display_name: str,
    category: str = "rope",
    brand: str | None = None,
    model: str | None = None,
) -> str:
    body: dict[str, str | None] = {
        "category": category,
        "display_name": display_name,
    }
    if brand is not None:
        body["brand"] = brand
    if model is not None:
        body["model"] = model
    resp = await post_with_csrf(client, csrf, "/api/restraint-types", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# --- Admin auto-approve on create -----------------------------------------


async def test_admin_create_arm_position_directly_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """ADR-042 §F: Admin-POST creates an entry with status='approved'."""
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        "/api/arm-positions",
        json={"name": "M7-AdminAutoApprove"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "approved"
    assert body["approved_by"] is not None
    assert body["suggested_by"] is None


async def test_admin_create_restraint_type_directly_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
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


# --- Reject ---------------------------------------------------------------


async def test_admin_rejects_arm_position_with_reason(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Reject-Cand")

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{entry_id}/reject",
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
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Reject-NoReason")

    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client, csrf_admin, f"/api/arm-positions/{entry_id}/reject", json={"reason": ""}
    )
    assert resp.status_code == 422, resp.text


async def test_editor_cannot_reject(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf, name="M7-Reject-Editor")
    resp = await post_with_csrf(
        client, csrf, f"/api/arm-positions/{entry_id}/reject", json={"reason": "x"}
    )
    assert resp.status_code == 403, resp.text


async def test_cannot_reject_already_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Reject-Approved")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/arm-positions/{entry_id}/approve")
    assert appr.status_code == 200
    resp = await post_with_csrf(
        client, csrf_admin, f"/api/arm-positions/{entry_id}/reject", json={"reason": "late"}
    )
    assert resp.status_code == 409, resp.text


async def test_admin_rejects_restraint_type(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    rt_id = await _propose_restraint_type(client, csrf_editor, display_name="M7-RT-Reject")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/restraint-types/{rt_id}/reject",
        json={"reason": "not on-brand"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "rejected"
    assert body["reject_reason"] == "not on-brand"


# --- Withdraw -------------------------------------------------------------


async def test_editor_withdraws_own_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf, name="M7-Withdraw-Own")
    resp = await delete_with_csrf(client, csrf, f"/api/arm-positions/{entry_id}")
    assert resp.status_code == 204, resp.text
    # Subsequent listing must not include the entry.
    listing = await client.get("/api/arm-positions")
    assert listing.status_code == 200
    ids = {item["id"] for item in listing.json()["items"]}
    assert entry_id not in ids


async def test_editor_cannot_withdraw_foreign_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    # Editor A proposes
    _, email_a, password_a = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_a = await login(client, email_a, password_a)
    entry_id = await _propose_arm_position(client, csrf_a, name="M7-Withdraw-Foreign")
    await client.post("/api/auth/logout")

    # Editor B tries to withdraw — RLS hides the row, so DELETE → 404.
    _, csrf_b = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await delete_with_csrf(client, csrf_b, f"/api/arm-positions/{entry_id}")
    assert resp.status_code == 404, resp.text


async def test_editor_cannot_withdraw_own_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_editor = await login(client, email, password)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Withdraw-Rejected")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{entry_id}/reject",
        json={"reason": "no"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    csrf_editor = await login(client, email, password)
    resp = await delete_with_csrf(client, csrf_editor, f"/api/arm-positions/{entry_id}")
    # RLS owner-withdraw policy only matches pending; rejected → no
    # policy USING evaluates true → DELETE finds no row → 404, OR the
    # service's status guard fires first → 409. Either is fine; the
    # invariant is "rejected can't be withdrawn by editor".
    assert resp.status_code in (404, 409), resp.text


async def test_admin_can_withdraw_any_pending(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_editor = await login(client, email, password)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Withdraw-AdminAny")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await delete_with_csrf(client, csrf_admin, f"/api/arm-positions/{entry_id}")
    assert resp.status_code == 204, resp.text


async def test_admin_cannot_withdraw_approved(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Withdraw-Approved")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/arm-positions/{entry_id}/approve")
    assert appr.status_code == 200
    resp = await delete_with_csrf(client, csrf_admin, f"/api/arm-positions/{entry_id}")
    assert resp.status_code == 409, resp.text


# --- Admin update ---------------------------------------------------------


async def test_admin_updates_lookup(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Update-Lookup-Old")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await patch_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{entry_id}",
        json={"name": "M7-Update-Lookup-New", "description": "renamed"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "M7-Update-Lookup-New"
    assert body["description"] == "renamed"
    # Status untouched by PATCH (ADR-043 §B).
    assert body["status"] == "pending"


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
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    first_id = await _propose_arm_position(client, csrf_editor, name="M7-Conflict-First")
    second_id = await _propose_arm_position(client, csrf_editor, name="M7-Conflict-Second")
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    resp = await patch_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{second_id}",
        json={"name": "M7-Conflict-First"},
    )
    assert resp.status_code == 409, resp.text
    assert "conflict" in resp.json()["detail"].lower()
    # Ensure original first entry is still there.
    listing = await client.get("/api/arm-positions")
    ids = {item["id"] for item in listing.json()["items"]}
    assert first_id in ids


async def test_editor_cannot_patch(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-Editor-Patch")
    resp = await patch_with_csrf(
        client, csrf_editor, f"/api/arm-positions/{entry_id}", json={"name": "M7-Foo"}
    )
    assert resp.status_code == 403, resp.text


# --- Status filter --------------------------------------------------------


async def test_listing_status_filter(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, csrf_editor = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    pending_id = await _propose_arm_position(client, csrf_editor, name="M7-Filter-Pending")
    approved_id = await _propose_arm_position(client, csrf_editor, name="M7-Filter-Approved")
    rejected_id = await _propose_arm_position(client, csrf_editor, name="M7-Filter-Rejected")
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    appr = await post_with_csrf(client, csrf_admin, f"/api/arm-positions/{approved_id}/approve")
    assert appr.status_code == 200
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{rejected_id}/reject",
        json={"reason": "filter test"},
    )
    assert rej.status_code == 200

    # Admin sees all three filtered by status.
    for status_value, expected in (
        ("pending", pending_id),
        ("approved", approved_id),
        ("rejected", rejected_id),
    ):
        resp = await client.get(f"/api/arm-positions?status={status_value}")
        assert resp.status_code == 200, resp.text
        ids = {item["id"] for item in resp.json()["items"]}
        # All freshly created M7-Filter rows happen to have unique status,
        # so each filter result must contain exactly the matching one.
        m7_ids = {pending_id, approved_id, rejected_id}
        assert (ids & m7_ids) == {expected}


async def test_editor_sees_own_rejected_in_listing(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Proposing editor must keep visibility of own rejected entry."""
    _, email, password = await make_user(async_session_factory, role=UserRole.EDITOR)
    csrf_editor = await login(client, email, password)
    entry_id = await _propose_arm_position(client, csrf_editor, name="M7-OwnRejectedVis")
    await client.post("/api/auth/logout")

    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{entry_id}/reject",
        json={"reason": "see-me"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    csrf_editor = await login(client, email, password)
    resp = await client.get("/api/arm-positions?status=rejected")
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
    entry_id = await _propose_arm_position(client, csrf_a, name="M7-ForeignRejected")
    await client.post("/api/auth/logout")
    _, csrf_admin = await login_as(client, async_session_factory, role=UserRole.ADMIN)
    rej = await post_with_csrf(
        client,
        csrf_admin,
        f"/api/arm-positions/{entry_id}/reject",
        json={"reason": "secret"},
    )
    assert rej.status_code == 200
    await client.post("/api/auth/logout")

    _, _csrf_b = await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/api/arm-positions?status=rejected")
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.json()["items"]}
    assert entry_id not in ids
