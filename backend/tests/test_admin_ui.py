"""SQLAdmin auth bridge and ModelView smoke tests (M8.2, ADR-049).

We focus on the contracts the bridge has to satisfy:

* Anonymous and non-admin users get redirected to ``/login`` instead of
  the SQLAdmin login form.
* An authenticated admin (cookie set via ``/api/auth/login``) can list
  every registered ModelView - this also exercises the
  ``StampingAsyncSession`` since SQLAdmin runs queries with FORCE-RLS
  active.
* The ``/sqladmin/login`` route returns the SPA redirect, not the SQLAdmin
  template, even on direct hits.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from app.models.user import UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.api_helpers import login_as, make_user

pytestmark = pytest.mark.asyncio


_LOGIN_PATH = "/login"
_MODEL_PATHS = [
    "/sqladmin/user/list",
    "/sqladmin/person/list",
    "/sqladmin/event/list",
    "/sqladmin/application/list",
    "/sqladmin/restraint-type/list",
    "/sqladmin/arm-position/list",
    "/sqladmin/hand-position/list",
    "/sqladmin/hand-orientation/list",
]


@pytest.fixture
async def admin_client(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    """Yield an AsyncClient that is logged in as an admin."""
    await login_as(client, async_session_factory, role=UserRole.ADMIN)
    yield client


async def test_admin_root_redirects_anonymous_to_spa_login(
    client: AsyncClient,
) -> None:
    resp = await client.get("/sqladmin/", follow_redirects=False)
    # SQLAdmin's root view sits behind @login_required. Anonymous hits
    # bounce off our authenticate() which returns RedirectResponse(/login).
    assert resp.status_code == 302
    assert resp.headers["location"].rstrip("/") in {"/login", _LOGIN_PATH}


async def test_admin_login_get_redirects_to_spa(
    client: AsyncClient,
) -> None:
    resp = await client.get("/sqladmin/login", follow_redirects=False)
    assert resp.status_code == 302
    assert resp.headers["location"] == _LOGIN_PATH


async def test_editor_role_is_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.EDITOR)
    resp = await client.get("/sqladmin/", follow_redirects=False)
    assert resp.status_code == 302
    assert _LOGIN_PATH in resp.headers["location"]


async def test_viewer_role_is_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await login_as(client, async_session_factory, role=UserRole.VIEWER)
    resp = await client.get("/sqladmin/", follow_redirects=False)
    assert resp.status_code == 302
    assert _LOGIN_PATH in resp.headers["location"]


async def test_inactive_admin_is_rejected(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, email, password = await make_user(async_session_factory, role=UserRole.ADMIN)
    # First log in while still active so we get a valid session cookie.
    resp = await client.post("/api/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 204

    # Then deactivate the user out-of-band; the cookie keeps decoding,
    # but authenticate() must reject the now-inactive admin.
    async with async_session_factory() as session, session.begin():
        u = await session.get(type(user), user.id)
        assert u is not None
        u.is_active = False

    resp = await client.get("/sqladmin/", follow_redirects=False)
    assert resp.status_code == 302
    assert _LOGIN_PATH in resp.headers["location"]


async def test_admin_can_open_root(admin_client: AsyncClient) -> None:
    resp = await admin_client.get("/sqladmin", follow_redirects=False)
    # SQLAdmin redirects /sqladmin to /sqladmin/ then to its index. After
    # auth we expect a non-redirect-to-login response.
    assert resp.status_code in {200, 302, 307}
    if resp.status_code in {302, 307}:
        assert _LOGIN_PATH not in resp.headers["location"]


@pytest.mark.parametrize("path", _MODEL_PATHS)
async def test_admin_can_list_every_modelview(admin_client: AsyncClient, path: str) -> None:
    resp = await admin_client.get(path, follow_redirects=False)
    # A successful listing returns 200 and an HTML body. Failure modes
    # we explicitly want to catch: 302 to /login (auth bridge broken),
    # 500 (RLS stamp missing => zero-row + crash, or DI issue).
    assert resp.status_code == 200, (path, resp.status_code, resp.text[:200])
    assert "text/html" in resp.headers.get("content-type", "")


async def test_logout_clears_session_and_redirects(
    admin_client: AsyncClient,
) -> None:
    resp = await admin_client.get("/sqladmin/logout", follow_redirects=False)
    assert resp.status_code == 302
    assert resp.headers["location"] == _LOGIN_PATH
