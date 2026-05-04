"""MapTiler geocoding proxy (M6.1, ADR-041 §B/§D).

Wraps MapTiler's geocoding endpoint so the API key stays server-side and
adds a per-user in-memory token-bucket rate limit. Authenticated users
only — anonymous proxying would expose the upstream key to scraping.
"""

from __future__ import annotations

from collections import deque
from functools import lru_cache
from time import monotonic
from typing import Any
from urllib.parse import quote
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.auth.routes import current_active_user
from app.config import get_settings
from app.models.user import User

router = APIRouter(prefix="/geocode", tags=["geocode"])

_GEOCODE_CACHE_SECONDS = 300
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_RATE_WINDOW_SECONDS = 60.0


@lru_cache(maxsize=1)
def _http_client() -> httpx.AsyncClient:
    """Process-singleton AsyncClient.

    Tests monkey-patch ``app.routes.geocode._http_client`` to inject a fake.
    """
    return httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT)


_request_log: dict[UUID, deque[float]] = {}


def _now() -> float:
    """Monotonic clock indirection (tests monkey-patch this)."""
    return monotonic()


def reset_rate_limiter() -> None:
    """Drop the in-memory rate-limit state (test helper)."""
    _request_log.clear()


def _check_rate_limit(user_id: UUID, limit_per_minute: int) -> float | None:
    """Return retry-after seconds if blocked, else record and allow.

    A rolling 60-second window keyed by user. ``limit_per_minute == 0``
    disables the limiter entirely (returns ``None``).
    """
    if limit_per_minute <= 0:
        return None

    now = _now()
    window_start = now - _RATE_WINDOW_SECONDS
    bucket = _request_log.setdefault(user_id, deque())
    while bucket and bucket[0] < window_start:
        bucket.popleft()

    if len(bucket) >= limit_per_minute:
        oldest = bucket[0]
        retry_after = max(1.0, _RATE_WINDOW_SECONDS - (now - oldest))
        return retry_after

    bucket.append(now)
    return None


def _parse_proximity(raw: str) -> tuple[float, float]:
    """Parse ``lat,lon`` string into a validated (lat, lon) tuple."""
    parts = [p.strip() for p in raw.split(",")]
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="proximity must be 'lat,lon'.",
        )
    try:
        lat = float(parts[0])
        lon = float(parts[1])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="proximity must contain two numeric values.",
        ) from exc

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="proximity coordinates out of range.",
        )
    return lat, lon


def _build_upstream_url(
    *,
    api_key: str,
    query: str,
    proximity: tuple[float, float] | None,
    limit: int,
) -> str:
    params: list[tuple[str, str]] = [
        ("key", api_key),
        ("limit", str(limit)),
        ("language", "de"),
    ]
    if proximity is not None:
        lat, lon = proximity
        # MapTiler expects "lon,lat" — translate from project convention.
        params.append(("proximity", f"{lon},{lat}"))

    encoded_query = quote(query, safe="")
    query_string = "&".join(f"{k}={quote(v, safe=',')}" for k, v in params)
    return f"https://api.maptiler.com/geocoding/{encoded_query}.json?{query_string}"


def _retry_after_header(seconds: float) -> dict[str, str]:
    return {"Retry-After": str(max(1, round(seconds)))}


@router.get(
    "",
    summary=(
        "Proxy geocoding query to MapTiler (auth required, server-side key, per-user rate limit)"
    ),
)
async def geocode(
    q: str = Query(..., min_length=1, max_length=200),
    proximity: str | None = Query(default=None),
    limit: int = Query(default=5, ge=1, le=10),
    user: User = Depends(current_active_user),
) -> JSONResponse:
    settings = get_settings()
    if not settings.maptiler_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding provider not configured.",
        )

    retry_after = _check_rate_limit(user.id, settings.geocode_rate_per_minute)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded.",
            headers=_retry_after_header(retry_after),
        )

    parsed_proximity = _parse_proximity(proximity) if proximity is not None else None

    url = _build_upstream_url(
        api_key=settings.maptiler_api_key,
        query=q,
        proximity=parsed_proximity,
        limit=limit,
    )
    client = _http_client()
    try:
        upstream = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding upstream unreachable.",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding upstream returned error.",
        )

    try:
        payload: Any = upstream.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding upstream returned invalid JSON.",
        ) from exc

    return JSONResponse(
        content=payload,
        headers={"Cache-Control": f"private, max-age={_GEOCODE_CACHE_SECONDS}"},
    )


__all__ = ("reset_rate_limiter", "router")
