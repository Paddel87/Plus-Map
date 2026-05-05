"""fastapi-users ``UserManager`` and DB adapter.

Hashes passwords with Argon2id (parameters in ``app.config.Settings``).
Hooks ``on_after_*`` route the relevant tokens through ``EmailBackend`` so
the password-reset and verify flows are wired, and emit structured audit
events (``auth.login.success``, ``auth.forgot_password.requested``,
``auth.password.reset.success``) with a SHA-256 user-id hash — never the
plaintext id or email (M11-HOTFIX-003 / ADR-054).
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from collections.abc import AsyncIterator
from typing import Any

import structlog
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.password import PasswordHelper
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.mail import EmailBackend, get_email_backend
from app.config import get_settings
from app.db import get_session
from app.models.user import User


def _audit_logger() -> Any:
    """Per-call logger lookup so ``structlog.testing.capture_logs`` can patch.

    See note in ``app.logging_middleware._logger`` — module-level
    ``get_logger`` would be cached before tests' capture context activates.
    """
    return structlog.get_logger("plusmap.auth")


def _user_id_hash(user_id: uuid.UUID) -> str:
    """Truncated SHA-256 of the user uuid — stable across sessions, not reversible.

    Used in audit events so operators can correlate ``auth.login.success`` with
    the matching ``http.request`` line for a specific user without exposing
    plaintext identifiers in logs (project-context.md §6).
    """
    return hashlib.sha256(str(user_id).encode("ascii")).hexdigest()[:16]


def _password_helper() -> PasswordHelper:
    """Argon2id-only password helper using OWASP-recommended parameters."""
    settings = get_settings()
    hasher = PasswordHash(
        (
            Argon2Hasher(
                time_cost=settings.argon2_time_cost,
                memory_cost=settings.argon2_memory_cost,
                parallelism=settings.argon2_parallelism,
            ),
        )
    )
    return PasswordHelper(hasher)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """Application UserManager.

    ``reset_password_token_secret`` and ``verification_token_secret`` are
    derived from the runtime SECRET_KEY so a key-rotation invalidates
    outstanding tokens.
    """

    def __init__(
        self,
        user_db: SQLAlchemyUserDatabase[User, uuid.UUID],
        email_backend: EmailBackend,
    ) -> None:
        password_helper = _password_helper()
        super().__init__(user_db, password_helper)
        self._email = email_backend
        secret = get_settings().secret_key
        self.reset_password_token_secret = secret
        self.verification_token_secret = secret

    async def on_after_login(
        self,
        user: User,
        request: Request | None = None,
        response: Any = None,
    ) -> None:
        _audit_logger().info(
            "auth.login.success",
            user_id_hash=_user_id_hash(user.id),
        )

    async def on_after_forgot_password(
        self,
        user: User,
        token: str,
        request: Request | None = None,
    ) -> None:
        await self._email.send_password_reset(user.email, token)
        _audit_logger().info(
            "auth.forgot_password.requested",
            user_id_hash=_user_id_hash(user.id),
        )

    async def on_after_reset_password(
        self,
        user: User,
        request: Request | None = None,
    ) -> None:
        _audit_logger().info(
            "auth.password.reset.success",
            user_id_hash=_user_id_hash(user.id),
        )

    async def on_after_request_verify(
        self,
        user: User,
        token: str,
        request: Request | None = None,
    ) -> None:
        await self._email.send_verify(user.email, token)


async def get_user_db(
    session: AsyncSession = Depends(get_session),
) -> AsyncIterator[SQLAlchemyUserDatabase[User, uuid.UUID]]:
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase[User, uuid.UUID] = Depends(get_user_db),
    email_backend: EmailBackend = Depends(get_email_backend),
) -> AsyncIterator[UserManager]:
    yield UserManager(user_db, email_backend)


def generate_csrf_token() -> str:
    """Return a fresh URL-safe CSRF token (256 bits of entropy)."""
    return secrets.token_urlsafe(32)
