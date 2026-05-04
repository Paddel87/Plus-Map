"""Auth-flow + CSRF tests (Fahrplan: M2 DoD)."""

from __future__ import annotations

import secrets

from app.auth.manager import _password_helper
from app.models.person import Person
from app.models.user import User, UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


def _email() -> str:
    return f"u{secrets.token_hex(4)}@example.com"


async def _create_user(
    sm: async_sessionmaker[AsyncSession],
    *,
    role: UserRole = UserRole.ADMIN,
    password: str = "TestPassword-12chars",
) -> tuple[User, str, str]:
    email = _email()
    helper = _password_helper()
    async with sm() as session, session.begin():
        person = Person(name=f"Person-{secrets.token_hex(2)}")
        session.add(person)
        await session.flush()
        user = User(
            email=email,
            hashed_password=helper.hash(password),
            is_active=True,
            is_verified=True,
            is_superuser=False,
            role=role,
            person_id=person.id,
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)
        await session.refresh(person)
        # Detach from session before it closes.
        session.expunge_all()
    return user, email, password


async def test_login_sets_both_cookies(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await _create_user(async_session_factory)
    resp = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 204, resp.text
    cookies = resp.cookies
    assert "hcmap_session" in cookies
    assert "hcmap_csrf" in cookies


async def test_login_wrong_password_returns_400(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, _ = await _create_user(async_session_factory)
    resp = await client.post(
        "/api/auth/login",
        data={"username": email, "password": "wrong-and-also-12-chars"},
    )
    assert resp.status_code == 400


async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/users/me")
    assert resp.status_code == 401


async def test_me_returns_user(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, email, password = await _create_user(async_session_factory)
    login = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 204
    resp = await client.get("/api/users/me")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == email
    assert body["role"] == user.role.value


async def test_csrf_blocks_state_changing_request_without_token(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    user, email, password = await _create_user(async_session_factory)
    login = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 204

    # Issue a PATCH without echoing the CSRF cookie -> 403.
    resp = await client.patch(
        f"/api/users/{user.id}",
        json={"display_name": "should be blocked"},
    )
    assert resp.status_code == 403
    assert "CSRF" in resp.text


async def test_csrf_passes_with_matching_header(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await _create_user(async_session_factory)
    login = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    csrf = login.cookies.get("hcmap_csrf")
    assert csrf is not None

    resp = await client.patch(
        "/api/users/me",
        json={"display_name": "New Name"},
        headers={"X-CSRF-Token": csrf},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["display_name"] == "New Name"


async def test_logout_clears_cookies(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _, email, password = await _create_user(async_session_factory)
    login = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 204
    resp = await client.post("/api/auth/logout")
    assert resp.status_code == 204
    # After logout /me should reject.
    me = await client.get("/api/users/me")
    assert me.status_code == 401


async def test_login_path_is_csrf_whitelisted(
    client: AsyncClient,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Login itself must succeed without a pre-existing CSRF cookie."""
    _, email, password = await _create_user(async_session_factory)
    resp = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 204
