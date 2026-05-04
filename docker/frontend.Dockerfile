# syntax=docker/dockerfile:1.7
# Frontend image: Next.js (App Router) with the standalone output.
# Multi-stage build keeps the runtime image free of pnpm and dev tooling.

ARG NODE_VERSION=22

# ---- Dependencies stage ---------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1

RUN corepack enable

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ---- Build stage ----------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./

RUN pnpm build

# ---- Runtime stage --------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    BACKEND_INTERNAL_URL=http://backend:8000

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs --home-dir /app --shell /usr/sbin/nologin nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
