"""Double-submit-token CSRF protection (ADR-019, decision C1).

After a successful login the auth router sets a non-HttpOnly cookie
``plusmap_csrf`` carrying a random token. Every state-changing request
(POST/PUT/PATCH/DELETE) must echo the same value in the
``X-CSRF-Token`` header. Mismatch -> 403.

Whitelisted paths bypass the check:
- ``/api/health`` (anonymous probe)
- ``/api/auth/login`` (the cookie is set as a side effect of this call)
- ``/api/auth/forgot-password`` and ``/api/auth/reset-password``
"""

from __future__ import annotations

import hmac
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

CSRF_COOKIE = "plusmap_csrf"
CSRF_HEADER = "X-CSRF-Token"

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
_WHITELIST_PREFIXES = (
    "/api/health",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/request-verify-token",
    "/api/auth/verify",
    "/api/openapi.json",
    "/api/docs",
)


def _is_whitelisted(path: str) -> bool:
    return any(path.startswith(p) for p in _WHITELIST_PREFIXES)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Reject state-changing requests without a matching token."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method in _SAFE_METHODS or _is_whitelisted(request.url.path):
            return await call_next(request)

        cookie = request.cookies.get(CSRF_COOKIE)
        header = request.headers.get(CSRF_HEADER)
        if not cookie or not header or not hmac.compare_digest(cookie, header):
            return JSONResponse(
                {"detail": "CSRF token missing or invalid."},
                status_code=403,
            )
        return await call_next(request)
