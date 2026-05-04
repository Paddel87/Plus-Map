"""Auth router exposing the subset of fastapi-users endpoints we ship.

Self-registration is intentionally **not** exposed (see ADR-006 and the
project-context Path A model). Admin-side user creation lives in
``/api/admin/users`` (M3+).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter
from fastapi_users import FastAPIUsers

from app.auth.backend import cookie_backend
from app.auth.manager import get_user_manager
from app.auth.schemas import UserRead, UserUpdate
from app.models.user import User

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [cookie_backend],
)

current_active_user = fastapi_users.current_user(active=True)
current_active_verified_user = fastapi_users.current_user(active=True, verified=False)


def build_auth_router() -> APIRouter:
    """Mount /login, /logout, /forgot-password, /reset-password, /me."""
    router = APIRouter()
    router.include_router(
        fastapi_users.get_auth_router(cookie_backend, requires_verification=False),
        prefix="/auth",
        tags=["auth"],
    )
    router.include_router(
        fastapi_users.get_reset_password_router(),
        prefix="/auth",
        tags=["auth"],
    )
    router.include_router(
        fastapi_users.get_users_router(UserRead, UserUpdate),
        prefix="/users",
        tags=["users"],
    )
    return router
