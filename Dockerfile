# ── Aura Self-Hosted Backend — Production Dockerfile ─────────────────────────
#
# Multi-stage build:
#   Stage 1 (builder): Compiles TypeScript and installs dependencies with
#     native build tools (python3, make, g++) for better-sqlite3.
#   Stage 2 (runtime): Contains ONLY the compiled JS and native binding.
#     No TypeScript sources, no build tools.

# ── Stage 1: Build ─────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Reinstall production-only dependencies (no dev deps, smaller image)
RUN rm -rf node_modules && npm ci --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN addgroup -S aura && adduser -S -G aura -u 1001 aura

WORKDIR /app

COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

RUN mkdir -p /data && chown aura:aura /data

USER aura

ENV PORT=3400
ENV AURA_DB_PATH=/data/aura.db

EXPOSE 3400

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
