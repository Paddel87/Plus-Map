"""SQLAdmin auth backend that re-uses the fastapi-users cookie (ADR-049 §B).

There is no separate admin login: SQLAdmin's ``authenticate`` reads the
``hcmap_session`` cookie that ``/api/auth/login`` already issued, decodes
it via ``JWTStrategy.read_token`` and returns ``True`` only for
active users with ``role = admin``. Failing requests are redirected to
the Next.js login page; the SQLAdmin login form is therefore unreachable
in normal operation.
"""

from __future__ import annotations

import uuid

from fastapi_users.exceptions import InvalidID, UserNotExists
from fastapi_users.jwt import decode_jwt
from jwt import PyJWTError
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.admin_ui.context import admin_person_id, admin_role, admin_user_id
from app.auth.backend import _jwt_strategy
from app.config import get_settings
from app.models.user import User, UserRole

_AUTH_COOKIE = "hcmap_session"
_LOGIN_REDIRECT = "/login"


class AdminAuthBackend(AuthenticationBackend):
    """Cookie-bridge between SQLAdmin and fastapi-users.

    The constructor takes a ``sessionmaker`` so tests can pass an isolated
    one. In production ``app.main`` wires it to ``app.db.get_sessionmaker``.
    """

    def __init__(
        self,
        secret_key: str,
        sessionmaker: async_sessionmaker[AsyncSession] | None = None,
    ) -> None:
        super().__init__(secret_key=secret_key)
        # Lazy import keeps the module testable without touching the global
        # engine when an explicit sessionmaker is provided.
        if sessionmaker is None:
            from app.db import get_sessionmaker

            sessionmaker = get_sessionmaker()
        self._sessionmaker = sessionmaker

    async def login(self, request: Request) -> bool:
        # SQLAdmin's default login form is intentionally not used. If the
        # admin actually POSTs to /admin/login (manual edge case), we
        # refuse - the cookie issued by /api/auth/login is the only path.
        return False

    async def logout(self, request: Request) -> Response | bool:
        # Clear the SQLAdmin session hint and bounce back to the SPA login
        # so the user can also drop the fastapi-users cookie there.
        request.session.clear()
        return RedirectResponse(_LOGIN_REDIRECT, status_code=302)

    async def authenticate(self, request: Request) -> Response | bool:
        token = request.cookies.get(_AUTH_COOKIE)
        if not token:
            return RedirectResponse(_LOGIN_REDIRECT, status_code=302)

        user = await self._user_for_token(token)
        if user is None or not user.is_active or user.role != UserRole.ADMIN:
            return RedirectResponse(_LOGIN_REDIRECT, status_code=302)

        # Stash the identity in ContextVars so the StampingAsyncSession
        # picks it up when SQLAdmin opens its own DB sessions.
        admin_user_id.set(user.id)
        admin_role.set(user.role)
        admin_person_id.set(user.person_id)

        # Cache the admin user id in the SQLAdmin session for templates
        # and downstream consumers that don't hit the DB.
        request.session["admin_user_id"] = str(user.id)
        return True

    async def _user_for_token(self, token: str) -> User | None:
        strategy = _jwt_strategy()
        try:
            data = decode_jwt(
                token,
                strategy.decode_key,
                strategy.token_audience,
                algorithms=[strategy.algorithm],
            )
        except PyJWTError:
            return None

        sub = data.get("sub")
        if not isinstance(sub, str):
            return None
        try:
            user_id = uuid.UUID(sub)
        except (ValueError, InvalidID):
            return None

        async with self._sessionmaker() as session:
            try:
                return await session.get(User, user_id)
            except UserNotExists:
                return None


def build_admin_auth_backend() -> AdminAuthBackend:
    """Construct the production auth backend with the runtime secret."""
    return AdminAuthBackend(secret_key=get_settings().secret_key)
