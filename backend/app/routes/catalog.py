"""Catalog routes for the EquipmentItem (outdoor-equipment) catalog."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_rls_session, require_role
from app.models.base import Base
from app.models.catalog import CatalogStatus, EquipmentItem
from app.models.user import User, UserRole
from app.schemas.catalog import (
    CatalogReject,
    EquipmentItemCreate,
    EquipmentItemRead,
    EquipmentItemUpdate,
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


# --- EquipmentItem --------------------------------------------------------

equipment_items_router = APIRouter(prefix="/equipment-items", tags=["equipment-items"])


@equipment_items_router.get("", response_model=Page[EquipmentItemRead])
async def list_equipment_items(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status_filter: CatalogStatus | None = Query(default=None, alias="status"),
    session: AsyncSession = Depends(get_rls_session),
) -> Page[EquipmentItemRead]:
    rows, total = await catalog_svc.list_lookup(
        session, EquipmentItem, limit=limit, offset=offset, status_filter=status_filter
    )
    return Page[EquipmentItemRead](
        items=[EquipmentItemRead.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@equipment_items_router.post(
    "", response_model=EquipmentItemRead, status_code=status.HTTP_201_CREATED
)
async def propose_equipment_item(
    payload: EquipmentItemCreate,
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.EDITOR)),
    session: AsyncSession = Depends(get_rls_session),
) -> EquipmentItemRead:
    try:
        entry = await catalog_svc.propose_equipment_item(
            session,
            payload=payload.model_dump(),
            suggested_by=user.id,
            auto_approve=user.role == UserRole.ADMIN,
        )
    except CatalogConflictError as exc:
        raise _conflict(exc) from exc
    return EquipmentItemRead.model_validate(entry)


@equipment_items_router.patch("/{entry_id}", response_model=EquipmentItemRead)
async def update_equipment_item(
    entry_id: uuid.UUID,
    payload: EquipmentItemUpdate,
    _user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> EquipmentItemRead:
    entry = await _get_or_404(session, EquipmentItem, entry_id)
    try:
        entry = await catalog_svc.update_equipment_item(
            session, entry, payload=payload.model_dump(exclude_unset=True)
        )
    except CatalogConflictError as exc:
        raise _conflict(exc) from exc
    return EquipmentItemRead.model_validate(entry)


@equipment_items_router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def withdraw_equipment_item(
    entry_id: uuid.UUID,
    _user: User = Depends(require_role(UserRole.ADMIN, UserRole.EDITOR)),
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    entry = await _get_or_404(session, EquipmentItem, entry_id)
    try:
        await catalog_svc.withdraw_entry(session, entry)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@equipment_items_router.post("/{entry_id}/approve", response_model=EquipmentItemRead)
async def approve_equipment_item(
    entry_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> EquipmentItemRead:
    entry = await _get_or_404(session, EquipmentItem, entry_id)
    try:
        await catalog_svc.approve_entry(session, entry, approved_by=user.id)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return EquipmentItemRead.model_validate(entry)


@equipment_items_router.post("/{entry_id}/reject", response_model=EquipmentItemRead)
async def reject_equipment_item(
    entry_id: uuid.UUID,
    payload: CatalogReject,
    user: User = Depends(require_role(UserRole.ADMIN)),
    session: AsyncSession = Depends(get_rls_session),
) -> EquipmentItemRead:
    entry = await _get_or_404(session, EquipmentItem, entry_id)
    try:
        await catalog_svc.reject_entry(session, entry, rejected_by=user.id, reason=payload.reason)
    except CatalogStateError as exc:
        raise _state_error(exc) from exc
    return EquipmentItemRead.model_validate(entry)
