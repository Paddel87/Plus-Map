"""Catalog service: list, propose, approve, reject, withdraw, update.

Covers the RestraintType (equipment) catalog per ADR-043. Status
transitions are exposed as named functions so the audit columns
(approved_by/rejected_by/rejected_at/reject_reason) can only be set in
one place.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import CatalogStatus, RestraintType


class CatalogConflictError(Exception):
    """Raised on UNIQUE-constraint violations during create/update."""


class CatalogStateError(Exception):
    """Raised when a status transition is attempted from an invalid state."""


async def list_lookup(
    session: AsyncSession,
    model: type[RestraintType],
    *,
    limit: int,
    offset: int,
    status_filter: CatalogStatus | None = None,
) -> tuple[Sequence[RestraintType], int]:
    """List entries the current request may see (RLS handles visibility).

    ``status_filter`` further constrains the result; if absent, every
    visible entry is returned. Visibility per role:

    - admin: everything
    - editor: approved + own pending + own rejected
    - viewer: approved only
    """
    stmt = select(model)
    count_stmt = select(func.count()).select_from(model)
    if status_filter is not None:
        stmt = stmt.where(model.status == status_filter)
        count_stmt = count_stmt.where(model.status == status_filter)
    total = await session.scalar(count_stmt)
    rows = (
        (await session.execute(stmt.order_by(model.created_at.desc()).limit(limit).offset(offset)))
        .scalars()
        .all()
    )
    return rows, int(total or 0)


async def propose_restraint_type(
    session: AsyncSession,
    *,
    payload: dict[str, Any],
    suggested_by: uuid.UUID,
    auto_approve: bool = False,
) -> RestraintType:
    """Insert a new RestraintType. ``auto_approve`` short-circuits the
    propose-then-approve dance for admin-created entries (ADR-042 §F)."""
    common = dict(
        category=payload["category"],
        brand=payload.get("brand"),
        model=payload.get("model"),
        mechanical_type=payload.get("mechanical_type"),
        display_name=payload["display_name"],
        note=payload.get("note"),
    )
    if auto_approve:
        entry = RestraintType(
            **common,
            status=CatalogStatus.APPROVED,
            approved_by=suggested_by,
        )
    else:
        entry = RestraintType(
            **common,
            status=CatalogStatus.PENDING,
            suggested_by=suggested_by,
        )
    session.add(entry)
    try:
        await session.flush()
    except IntegrityError as exc:
        raise CatalogConflictError(str(exc.orig)) from exc
    await session.refresh(entry)
    return entry


async def update_restraint_type(
    session: AsyncSession,
    entry: RestraintType,
    *,
    payload: dict[str, Any],
) -> RestraintType:
    """Apply admin PATCH to a RestraintType entry."""
    for field in ("category", "brand", "model", "mechanical_type", "display_name", "note"):
        if field in payload:
            setattr(entry, field, payload[field])
    entry.updated_at = datetime.now(tz=UTC)
    try:
        await session.flush()
    except IntegrityError as exc:
        raise CatalogConflictError(str(exc.orig)) from exc
    await session.refresh(entry)
    return entry


async def approve_entry(
    session: AsyncSession,
    entry: RestraintType,
    *,
    approved_by: uuid.UUID,
) -> RestraintType:
    """Set status to approved. Allowed from pending; idempotent on
    already-approved (no-op). Rejects rejected → approved transitions
    (must go through reset-to-pending workflow not in M7 scope).
    """
    if entry.status == CatalogStatus.REJECTED:
        raise CatalogStateError("Cannot approve a rejected entry directly.")
    entry.status = CatalogStatus.APPROVED
    entry.approved_by = approved_by
    entry.rejected_by = None
    entry.rejected_at = None
    entry.reject_reason = None
    entry.updated_at = datetime.now(tz=UTC)
    await session.flush()
    await session.refresh(entry)
    return entry


async def reject_entry(
    session: AsyncSession,
    entry: RestraintType,
    *,
    rejected_by: uuid.UUID,
    reason: str,
) -> RestraintType:
    """Set status to rejected with audit fields. Allowed from pending."""
    if entry.status != CatalogStatus.PENDING:
        raise CatalogStateError(
            f"Cannot reject from status={entry.status.value}; only 'pending' allowed."
        )
    entry.status = CatalogStatus.REJECTED
    entry.rejected_by = rejected_by
    entry.rejected_at = datetime.now(tz=UTC)
    entry.reject_reason = reason
    entry.updated_at = entry.rejected_at
    await session.flush()
    await session.refresh(entry)
    return entry


async def withdraw_entry(
    session: AsyncSession,
    entry: RestraintType,
) -> None:
    """Hard-delete a pending entry (admin: any pending; editor: own only).

    RLS enforces the editor-only-own-pending rule via
    ``restraint_type_owner_withdraw`` policy. Admin uses
    ``restraint_type_admin_modify``. Status validation is the service's
    job so we return a clean 4xx instead of a silent RLS no-op.
    """
    if entry.status != CatalogStatus.PENDING:
        raise CatalogStateError(
            f"Cannot withdraw from status={entry.status.value}; only 'pending' allowed."
        )
    await session.delete(entry)
    await session.flush()
