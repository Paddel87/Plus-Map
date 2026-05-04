# syntax=docker/dockerfile:1.7
# Backend image: FastAPI served by uvicorn. Multi-stage build with uv.

ARG PYTHON_VERSION=3.12

# ---- Build stage ----------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:0.11.8 /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first for layer caching.
COPY backend/pyproject.toml backend/uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project || \
    uv sync --no-dev --no-install-project

# Project source. The migrations dir + alembic.ini ship with the image so
# the auto-migration runner (app/migrations_runner.py, ADR-051 §F) finds
# its script_location at /app/migrations on container startup. The scripts
# package ships too so operators can `docker exec backend python -m
# scripts.bootstrap_admin ...` per ops/runbook.md §9.
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY backend/alembic.ini ./alembic.ini
COPY backend/scripts ./scripts
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev || uv sync --no-dev

# ---- Runtime stage --------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN groupadd --system --gid 1001 hcmap \
    && useradd --system --uid 1001 --gid hcmap --home-dir /app --shell /usr/sbin/nologin hcmap

WORKDIR /app

COPY --from=builder --chown=hcmap:hcmap /app/.venv /app/.venv
COPY --from=builder --chown=hcmap:hcmap /app/app /app/app
COPY --from=builder --chown=hcmap:hcmap /app/migrations /app/migrations
COPY --from=builder --chown=hcmap:hcmap /app/alembic.ini /app/alembic.ini
COPY --from=builder --chown=hcmap:hcmap /app/scripts /app/scripts

USER hcmap

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
