"""FastAPI application entry point.

M0: minimal app with /api/health.
M2: auth (cookie + JWT), CSRF middleware, anonymous health endpoint.
Domain routers (events, applications, …) follow in M3.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.admin_ui import register_admin
from app.auth.manager import generate_csrf_token
from app.auth.routes import build_auth_router
from app.config import Settings, get_settings
from app.logging import configure_logging
from app.logging_middleware import request_logger
from app.migrations_runner import run_migrations_with_advisory_lock
from app.routes.admin import router as admin_router
from app.routes.applications import router as applications_router
from app.routes.catalog import equipment_items_router
from app.routes.events import router as events_router
from app.routes.exports import router as exports_router
from app.routes.geocode import router as geocode_router
from app.routes.glyphs import router as glyphs_router
from app.routes.persons import router as persons_router
from app.routes.search import router as search_router
from app.routes.tiles import router as tiles_router
from app.security.csrf import CSRF_COOKIE, CSRFMiddleware
from app.sync.routes import router as sync_router


class HealthResponse(BaseModel):
    """Health probe payload."""

    status: str
    environment: str


def _csrf_cookie_setter(
    settings_secure: bool, lifetime: int
) -> Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]:
    """Issue a fresh CSRF cookie alongside ``Set-Cookie: plusmap_session``.

    fastapi-users sets the auth cookie inside its ``/login`` handler. We
    inspect the response right after the route runs and, if a new
    session cookie was set, attach a matching CSRF cookie. This avoids
    monkey-patching the auth router.
    """

    async def middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        if request.url.path.endswith("/auth/login") and response.status_code < 400:
            token = generate_csrf_token()
            response.set_cookie(
                key=CSRF_COOKIE,
                value=token,
                max_age=lifetime,
                secure=settings_secure,
                httponly=False,  # client must read it to echo in X-CSRF-Token
                samesite="lax",
            )
        elif request.url.path.endswith("/auth/logout"):
            response.delete_cookie(CSRF_COOKIE)
        return response

    return middleware


def _build_lifespan(
    settings: Settings,
) -> Callable[[FastAPI], AbstractAsyncContextManager[None]]:
    """Lifespan that auto-runs alembic migrations on production startup.

    Gated by ``PLUSMAP_ENVIRONMENT`` and ``PLUSMAP_SKIP_MIGRATIONS`` (see
    ``app.migrations_runner``). Tests skip via the environment guard so
    they continue to own their own schema lifecycle.
    """

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await run_migrations_with_advisory_lock(settings)
        yield

    return lifespan


def create_app() -> FastAPI:
    """Build and return the FastAPI application."""
    settings = get_settings()
    configure_logging(
        level=settings.log_level,
        json_output=settings.environment != "development",
    )

    app = FastAPI(
        title="Plus-Map API",
        version="0.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=_build_lifespan(settings),
    )

    app.middleware("http")(
        _csrf_cookie_setter(
            settings_secure=settings.cookie_secure,
            lifetime=settings.cookie_lifetime_seconds,
        )
    )
    app.add_middleware(CSRFMiddleware)
    # Outermost middleware: structured access log + request-id propagation
    # (M11-HOTFIX-003 / ADR-054). Registered last so the duration measurement
    # wraps every other middleware and the X-Request-ID header survives all
    # downstream Set-Cookie/header mutations.
    app.middleware("http")(request_logger)

    @app.get("/api/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", environment=settings.environment)

    app.include_router(build_auth_router(), prefix="/api")
    app.include_router(events_router, prefix="/api")
    app.include_router(applications_router, prefix="/api")
    app.include_router(persons_router, prefix="/api")
    app.include_router(equipment_items_router, prefix="/api")
    app.include_router(search_router, prefix="/api")
    app.include_router(exports_router, prefix="/api")
    app.include_router(tiles_router, prefix="/api")
    app.include_router(glyphs_router, prefix="/api")
    app.include_router(geocode_router, prefix="/api")
    app.include_router(sync_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

    # SQLAdmin's default ``/sqladmin/login`` template would show a
    # username/password form that we never use - bounce direct hits to
    # the SPA login. Registered before ``register_admin`` so SQLAdmin's
    # mount doesn't shadow it. ``/admin/login`` is now a frontend route
    # (ADR-055, fixes #19).
    @app.get("/sqladmin/login", include_in_schema=False)
    async def _sqladmin_login_redirect() -> RedirectResponse:
        return RedirectResponse(url="/login", status_code=302)

    register_admin(app)

    return app


app = create_app()
