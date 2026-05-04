"""Helpers for the M3 HTTP API tests.

Each helper starts from a logged-in ``AsyncClient`` and exposes a small
DSL: ``post_with_csrf``, ``patch_with_csrf``, ``delete_with_csrf`` so the
CSRF dance doesn't pollute every test body.
"""

from __future__ import annotations

import secrets
from typing import Any

from app.auth.manager import _password_helper
from app.models.person import Person
from app.models.user import User, UserRole
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


def random_email() -> str:
    return f"u{secrets.token_hex(4)}@example.com"


async def make_user(
    sm: async_sessionmaker[AsyncSession],
    *,
    role: UserRole,
    password: str = "TestPassword-12chars",
) -> tuple[User, str, str]:
    email = random_email()
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
        session.expunge_all()
    return user, email, password


async def login(client: AsyncClient, email: str, password: str) -> str:
    """Log the user in via /api/auth/login and return the CSRF token."""
    resp = await client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 204, resp.text
    csrf = resp.cookies.get("hcmap_csrf")
    assert csrf is not None
    return csrf


async def login_as(
    client: AsyncClient,
    sm: async_sessionmaker[AsyncSession],
    *,
    role: UserRole,
) -> tuple[User, str]:
    user, email, password = await make_user(sm, role=role)
    csrf = await login(client, email, password)
    return user, csrf


async def post_with_csrf(client: AsyncClient, csrf: str, url: str, **kwargs: Any):
    headers = kwargs.pop("headers", {}) or {}
    headers["X-CSRF-Token"] = csrf
    return await client.post(url, headers=headers, **kwargs)


async def patch_with_csrf(client: AsyncClient, csrf: str, url: str, **kwargs: Any):
    headers = kwargs.pop("headers", {}) or {}
    headers["X-CSRF-Token"] = csrf
    return await client.patch(url, headers=headers, **kwargs)


async def delete_with_csrf(client: AsyncClient, csrf: str, url: str, **kwargs: Any):
    headers = kwargs.pop("headers", {}) or {}
    headers["X-CSRF-Token"] = csrf
    return await client.delete(url, headers=headers, **kwargs)
