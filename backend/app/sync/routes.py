"""RxDB replication endpoints (M5b.2, ADR-017, ADR-029, ADR-030).

Two collections (event, application), each with a pull cursor query and
a push handler. Auth and CSRF protection inherit from the global
middleware (CSRF guards POST/PATCH/DELETE — pull is GET, push is POST).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.routes import current_active_user
from app.deps import get_rls_session
from app.models.user import User
from app.sync import services as sync_svc
from app.sync.schemas import (
    ApplicationDoc,
    ApplicationPullResponse,
    ApplicationPushItem,
    EventDoc,
    EventParticipantPullResponse,
    EventPullResponse,
    EventPushItem,
    SyncCheckpoint,
)

router = APIRouter(prefix="/sync", tags=["sync"])


def _checkpoint(
    updated_at: datetime | None,
    cursor_id: uuid.UUID | None,
) -> SyncCheckpoint | None:
    if updated_at is None and cursor_id is None:
        return None
    if updated_at is None or cursor_id is None:
        # Both must be supplied or neither.
        return None
    return SyncCheckpoint(updated_at=updated_at, id=cursor_id)


@router.get(
    "/events/pull",
    response_model=EventPullResponse,
    summary="Pull event documents updated since the cursor",
)
async def pull_events(
    updated_at: datetime | None = Query(default=None, description="Cursor timestamp"),
    cursor_id: uuid.UUID | None = Query(
        default=None,
        alias="id",
        description="Cursor id (tiebreaker)",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_rls_session),
) -> EventPullResponse:
    return await sync_svc.pull_events(
        session,
        checkpoint=_checkpoint(updated_at, cursor_id),
        limit=limit,
    )


@router.post(
    "/events/push",
    response_model=list[EventDoc],
    summary="Push event changes; returns conflicts as server master docs",
)
async def push_events(
    items: list[EventPushItem],
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> list[EventDoc]:
    return await sync_svc.push_events(session, items, user=user)


@router.get(
    "/applications/pull",
    response_model=ApplicationPullResponse,
    summary="Pull application documents updated since the cursor",
)
async def pull_applications(
    updated_at: datetime | None = Query(default=None, description="Cursor timestamp"),
    cursor_id: uuid.UUID | None = Query(
        default=None,
        alias="id",
        description="Cursor id (tiebreaker)",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_rls_session),
) -> ApplicationPullResponse:
    return await sync_svc.pull_applications(
        session,
        checkpoint=_checkpoint(updated_at, cursor_id),
        limit=limit,
    )


@router.post(
    "/applications/push",
    response_model=list[ApplicationDoc],
    summary="Push application changes; returns conflicts as server master docs",
)
async def push_applications(
    items: list[ApplicationPushItem],
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_rls_session),
) -> list[ApplicationDoc]:
    return await sync_svc.push_applications(session, items, user=user)


# --- event_participant: pull-only sync (M5c.1b, ADR-037 §D) -----------


@router.get(
    "/event-participants/pull",
    response_model=EventParticipantPullResponse,
    summary="Pull event-participant rows updated since the cursor",
)
async def pull_event_participants(
    updated_at: datetime | None = Query(default=None, description="Cursor timestamp"),
    cursor_id: uuid.UUID | None = Query(
        default=None,
        alias="id",
        description="Cursor id (tiebreaker)",
    ),
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_rls_session),
) -> EventParticipantPullResponse:
    return await sync_svc.pull_event_participants(
        session,
        checkpoint=_checkpoint(updated_at, cursor_id),
        limit=limit,
    )
