"""Row-Level-Security mechanics (ADR-019, decision E1).

This module is import-cycle-free: it only knows about SQLAlchemy and the
domain enums. The actual FastAPI dependency that combines
``current_user`` with a session that has the GUCs set lives in
``app.deps``.

Per-request flow:

1. Acquire a fresh connection from the pool, begin a transaction.
2. ``SET LOCAL ROLE app_user`` so RLS policies addressed at ``app_user``
   apply to subsequent statements.
3. Set per-request GUCs (current_user_id, current_role,
   current_person_id) used by the policies in
   ``architecture.md`` §RLS.
4. Yield an ``AsyncSession`` bound to that connection.
5. On exit the transaction is committed (or rolled back on exception);
   ``SET LOCAL`` values are dropped automatically.
"""

from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole


async def stamp_session(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    role: UserRole,
    person_id: uuid.UUID,
) -> None:
    """Bind ``session`` to ``app_user`` and stamp the per-request GUCs.

    Must be called inside an active transaction so ``SET LOCAL`` values
    are scoped to that transaction.
    """
    await session.execute(text("SET LOCAL ROLE app_user"))
    await session.execute(
        text("SELECT set_config('app.current_user_id', :v, true)"),
        {"v": str(user_id)},
    )
    await session.execute(
        text("SELECT set_config('app.current_role', :v, true)"),
        {"v": role.value},
    )
    await session.execute(
        text("SELECT set_config('app.current_person_id', :v, true)"),
        {"v": str(person_id)},
    )
