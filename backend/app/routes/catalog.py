"""Catalog routes for the RestraintType (equipment) catalog."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_rls_session, require_role
from app.models.base import Base
from app.models.catalog import CatalogStatus, RestraintType
from app.models.user import User, UserRole
from app.schemas.catalog import (
    CatalogReject,
    RestraintTypeCreate,
    RestraintTypeRead,
    RestraintTypeUpdate,
)
from app.schemas.common import Page
from app.services import catalog as catalog_svc
from app.services.catalog import CatalogConflictError, CatalogStateError


def _conflict(exc: CatalogConflictError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Catalog entry conflicts with an existing row: {exc}",
    )


def _state_error(exc: CatalogStateError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


async def _get_or_404[T: Base](
    session: AsyncSession,
    model: type[T],
    entry_id: uuid.UUID,
) -> T:
    entry = await session.get(model, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return entry


# --- RestraintType --------------------------------------------------------

restraint_types_router = APIRouter(prefix="/restraint-types", tags=["restraint-types"])


@restraint_types_router.get("", response_model=Page[RestraintTypeRead])
async def list_restraint_types(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status_filter: CatalogStatus | None = Query(default=None, alias="status"),
    session: AsyncSession = Depends(get_rls_session),
) -> Page[RestraintTypeRead]:
    rows, total = await catalog_svc.list_lookup(
        session, RestraintType, limit=limit, offset=offset, status_filter=status_filter
    )
    return Page[RestraintTypeRead](
        items=[RestraintTypeRead.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@restraint_types_router.post(
    "", response_model=RestraintTypeRead, status_code=status.HTTP_201_CREATED
)
async def propose_restraint_type(
    payload: RestraintTypeCreate,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.EDITOR)),
    session: AsyncSession = Depends(get_rls_session),
) -> RestraintTypeRead:
    try:
        entry = await catalog_svc.propose_restraint_type(
            session,
            payload=payload.model_dump(),
            suggested_by=user.id,
            auto_approve=user.role == UserRole.ADMIN,
        )
    except CatalogConflictError as exc:
        raise _conflict(exc) from exc
    return RestraintTypeRead.model_validate(entry)


@restraint_types_router.patch("/{entry_id}", response_model=RestraintTypeRead)
async def update_restraint_type(
    entry_id: uuid.UUID,
    payload: RestraintTypeUpdate,
    _user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> RestraintTypeRead:
    entry = await _get_or_404(session, RestraintType, entry_id)
    try:
        entry = await catalog_svc.update_restraint_type(
            session, entry, payload=payload.model_dump(exclude_unset=True)
        )
    except CatalogConflictError as exc:
        raise _conflict(exc) from exc
    return RestraintTypeRead.model_validate(entry)


@restraint_types_router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def withdraw_restraint_type(
    entry_id: uuid.UUID,
    _user: User = Depends(require_role(UserRole.ADMIN, UserRole.EDITOR)),
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    entry = await _get_or_404(session, RestraintType, entry_id)
    try:
        await catalog_svc.withdraw_entry(session, entry)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@restraint_types_router.post("/{entry_id}/approve", response_model=RestraintTypeRead)
async def approve_restraint_type(
    entry_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> RestraintTypeRead:
    entry = await _get_or_404(session, RestraintType, entry_id)
    try:
        await catalog_svc.approve_entry(session, entry, approved_by=user.id)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return RestraintTypeRead.model_validate(entry)


@restraint_types_router.post("/{entry_id}/reject", response_model=RestraintTypeRead)
async def reject_restraint_type(
    entry_id: uuid.UUID,
    payload: CatalogReject,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> RestraintTypeRead:
    entry = await _get_or_404(session, RestraintType, entry_id)
    try:
        await catalog_svc.reject_entry(session, entry, rejected_by=user.id, reason=payload.reason)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return RestraintTypeRead.model_validate(entry)
