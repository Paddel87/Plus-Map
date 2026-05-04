"""Per-request admin identity for the SQLAdmin session-stamper.

Background: every domain table has ``FORCE ROW LEVEL SECURITY`` enabled,
so even the connection owner needs ``SET LOCAL ROLE app_user`` plus the
three ``app.current_*`` GUCs to see anything (ADR-019). FastAPI routes
get this via the ``get_rls_session`` dependency; SQLAdmin opens its own
sessions, so we carry the identity across through ``ContextVar``s set by
``AdminAuthBackend.authenticate`` and read by
``setup._StampingAsyncSession.__aenter__``.

ContextVars survive ``async``-task boundaries within the same request,
which matches Starlette's per-request task model.
"""

from __future__ import annotations

import uuid
from contextvars import ContextVar

from app.models.user import UserRole

admin_user_id: ContextVar[uuid.UUID | None] = ContextVar("admin_user_id", default=None)
admin_role: ContextVar[UserRole | None] = ContextVar("admin_role", default=None)
admin_person_id: ContextVar[uuid.UUID | None] = ContextVar("admin_person_id", default=None)
