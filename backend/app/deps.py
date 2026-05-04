"""FastAPI dependencies for RBAC and RLS-aware sessions.

``get_rls_session`` is what every domain endpoint should depend on once
M2 is live. It guarantees the request runs as ``app_user`` with the
right GUCs, so per-row policies in the database fire automatically.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.routes import current_active_user
from app.db import get_sessionmaker
from app.models.user import User, UserRole
from app.rls import stamp_session


async def get_rls_session(
    user: User = Depends(current_active_user),
) -> AsyncIterator[AsyncSession]:
    """Yield a session with RLS GUCs set for the current authenticated user."""
    sm = get_sessionmaker()
    async with sm() as session, session.begin():
        await stamp_session(
            session,
            user_id=user.id,
            role=user.role,
            person_id=user.person_id,
        )
        yield session


def require_role(*allowed: UserRole) -> Callable[[User], Awaitable[User]]:
    """Dependency factory: enforce that the current user has one of ``allowed``.

    Returns the user so the route can use it without an extra
    ``Depends(current_active_user)``.
    """

    async def _checker(user: User = Depends(current_active_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role.",
            )
        return user

    return _checker
