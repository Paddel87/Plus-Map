"""SQLAdmin construction with RLS-stamped sessions (ADR-049 §C, §D).

The custom ``_StampingAsyncSession`` runs ``stamp_session`` on
``__aenter__`` so SQLAdmin's per-action sessions satisfy the
``FORCE ROW LEVEL SECURITY`` requirement on the domain tables. Without
the stamp the connection role is the database owner, but the policies
target ``app_user`` and would return zero rows.

The identity comes from ``app.admin_ui.context`` ContextVars that
``AdminAuthBackend.authenticate`` populates earlier in the request.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from sqladmin import Admin
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.admin_ui.auth import build_admin_auth_backend
from app.admin_ui.context import admin_person_id, admin_role, admin_user_id
from app.db import get_engine
from app.models.user import UserRole
from app.rls import stamp_session


class _StampingAsyncSession(AsyncSession):
    """AsyncSession subclass that stamps ``app_user`` + GUCs on enter.

    SQLAdmin opens sessions via ``async with sessionmaker() as session``
    and starts running queries immediately. We auto-begin the
    transaction so ``SET LOCAL`` survives, then stamp from the
    request-scoped ContextVars.
    """

    async def __aenter__(self) -> _StampingAsyncSession:
        await super().__aenter__()
        user_id = admin_user_id.get()
        if user_id is None:
            # No admin context = no stamp. SQLAdmin's auth layer should
            # have redirected to login before any DB call lands here, so
            # this only fires when something bypasses auth (= bug).
            raise RuntimeError(
                "_StampingAsyncSession opened outside an authenticated admin request"
            )
        if not self.in_transaction():
            await self.begin()
        await stamp_session(
            self,
            user_id=user_id,
            role=admin_role.get() or UserRole.ADMIN,
            person_id=admin_person_id.get() or user_id,
        )
        return self


def _build_session_maker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=get_engine(),
        class_=_StampingAsyncSession,
        expire_on_commit=False,
    )


def register_admin(app: FastAPI, **admin_kwargs: Any) -> Admin:
    """Mount SQLAdmin on ``/sqladmin`` and register all ModelViews.

    The ``/admin`` namespace belongs to the Next.js frontend (Catalog,
    Users, Persons sub-routes); SQLAdmin sits on its own prefix so the
    reverse-proxy can route ``/sqladmin/*`` to the backend without
    catching frontend admin pages (ADR-055, fixes #19).
    """
    from app.admin_ui.views import ALL_MODEL_VIEWS

    admin = Admin(
        app=app,
        engine=get_engine(),
        session_maker=_build_session_maker(),
        base_url="/sqladmin",
        title="Plus-Map Admin",
        authentication_backend=build_admin_auth_backend(),
        **admin_kwargs,
    )
    for view in ALL_MODEL_VIEWS:
        admin.add_view(view)
    return admin
