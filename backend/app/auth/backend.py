"""Auth backend: HttpOnly cookie + JWT bearer (ADR-006, ADR-019)."""

from __future__ import annotations

from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)

from app.config import get_settings


def _cookie_transport() -> CookieTransport:
    settings = get_settings()
    return CookieTransport(
        cookie_name="plusmap_session",
        cookie_max_age=settings.cookie_lifetime_seconds,
        cookie_secure=settings.cookie_secure,
        cookie_httponly=True,
        cookie_samesite="lax",
    )


def _jwt_strategy() -> JWTStrategy:  # type: ignore[type-arg]
    settings = get_settings()
    return JWTStrategy(
        secret=settings.secret_key,
        lifetime_seconds=settings.cookie_lifetime_seconds,
    )


cookie_backend = AuthenticationBackend(
    name="cookie",
    transport=_cookie_transport(),
    get_strategy=_jwt_strategy,
)
