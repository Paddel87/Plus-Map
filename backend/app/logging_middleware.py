"""HTTP request logger with PII-safe redaction (M11-HOTFIX-003 / ADR-054).

Logs one line per request with method, route-template, status, duration and a
request id. Query strings and concrete path IDs never reach the log: the route
is taken from ``request.scope["route"].path`` (FastAPI's matched template, e.g.
``/api/events/{event_id}``), and unmatched paths run through a UUID-redaction
fallback. Authenticated user identity is emitted as a SHA-256 hash via the
``auth.*`` events in ``app.auth.manager`` — never as plaintext id or email.
"""

from __future__ import annotations

import re
import time
import uuid as uuid_lib
from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from starlette.requests import Request
from starlette.responses import Response

_UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)


def _logger() -> Any:
    """Per-call logger lookup so ``structlog.testing.capture_logs`` can patch.

    Module-level ``get_logger()`` would be cached before the test's capture
    context activates, sending events to the production renderer instead.
    Return type is ``Any`` because the bound-logger class is configured
    globally via ``structlog.configure()`` and therefore not statically known.
    """
    return structlog.get_logger("plusmap.http")


def _route_template(request: Request) -> str:
    """Return the matched FastAPI route template, or a UUID-redacted fallback.

    The template form (``/api/events/{event_id}``) keeps cardinality bounded
    and prevents concrete UUIDs/PII slipping into log aggregation systems.
    """
    route = request.scope.get("route")
    template = getattr(route, "path", None)
    if isinstance(template, str) and template:
        return template
    return _UUID_RE.sub("{redacted_uuid}", request.url.path)


def _level_for_status(status: int) -> str:
    if status >= 500:
        return "error"
    if status >= 400:
        return "warning"
    return "info"


async def request_logger(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Outer HTTP middleware: structured access log + request id propagation.

    Generates an ``X-Request-ID`` if the client did not send one, binds it on
    the structlog context so downstream loggers (``auth.*``, ``migrations.*``,
    domain audit events) inherit it, and emits ``http.request`` after the
    response is produced. Failures inside ``call_next`` produce a 500-level
    log and re-raise — Starlette's exception handler still drives the actual
    response.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid_lib.uuid4())
    structlog.contextvars.bind_contextvars(request_id=request_id)
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        _logger().error(
            "http.request",
            method=request.method,
            route=_route_template(request),
            status=500,
            duration_ms=duration_ms,
        )
        raise
    finally:
        structlog.contextvars.unbind_contextvars("request_id")

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    log = getattr(_logger(), _level_for_status(response.status_code))
    log(
        "http.request",
        method=request.method,
        route=_route_template(request),
        status=response.status_code,
        duration_ms=duration_ms,
        request_id=request_id,
    )

    if request.url.path.endswith("/auth/login") and 400 <= response.status_code < 500:
        _logger().warning(
            "auth.login.failed",
            status=response.status_code,
            request_id=request_id,
        )
    elif request.url.path.endswith("/auth/logout") and response.status_code < 400:
        _logger().info("auth.logout.success", request_id=request_id)
    return response
