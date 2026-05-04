"""Full-text search and "On this day" service (ADR-015, ADR-020 §G).

The German tsvector indexes (M1 GIN on ``to_tsvector('german', note)``)
are queried directly. RLS ensures the result is automatically filtered
to events the requester can see.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.event import Event
from app.schemas.search import SearchHit, ThrowbackEvent


async def search(
    session: AsyncSession,
    *,
    query: str,
    limit: int,
    offset: int,
) -> tuple[list[SearchHit], int]:
    """Run a German full-text search over Event.note and Application.note."""
    if not query.strip():
        return [], 0

    tsq = func.plainto_tsquery("german", query)

    # Soft-deleted rows are excluded from search hits (ADR-030); sync
    # endpoints are the only consumer that sees tombstones.
    event_q = (
        select(
            literal("event").label("type"),
            Event.id.label("id"),
            Event.id.label("event_id"),
            func.ts_headline("german", func.coalesce(Event.note, ""), tsq).label("snippet"),
        )
        .where(func.to_tsvector("german", func.coalesce(Event.note, "")).op("@@")(tsq))
        .where(Event.is_deleted.is_(False))
    )
    app_q = (
        select(
            literal("application").label("type"),
            Application.id.label("id"),
            Application.event_id.label("event_id"),
            func.ts_headline("german", func.coalesce(Application.note, ""), tsq).label("snippet"),
        )
        .where(func.to_tsvector("german", func.coalesce(Application.note, "")).op("@@")(tsq))
        .where(Application.is_deleted.is_(False))
    )
    union = event_q.union_all(app_q).subquery()

    total = await session.scalar(select(func.count()).select_from(union))
    rows = (
        await session.execute(
            select(union.c.type, union.c.id, union.c.event_id, union.c.snippet)
            .limit(limit)
            .offset(offset)
        )
    ).all()
    hits = [SearchHit(type=r[0], id=r[1], event_id=r[2], snippet=r[3]) for r in rows]
    return hits, int(total or 0)


async def throwbacks_today(session: AsyncSession) -> list[ThrowbackEvent]:
    """Return events from the same day-and-month in past years."""
    now = datetime.now(tz=UTC)
    rows = (
        await session.execute(
            select(Event.id, Event.started_at, Event.note)
            .where(func.extract("month", Event.started_at) == now.month)
            .where(func.extract("day", Event.started_at) == now.day)
            .where(func.extract("year", Event.started_at) < now.year)
            .where(Event.is_deleted.is_(False))
            .order_by(Event.started_at.desc())
        )
    ).all()
    return [
        ThrowbackEvent(
            id=row.id,
            started_at=row.started_at,
            note=row.note,
            years_ago=now.year - row.started_at.year,
        )
        for row in rows
    ]
