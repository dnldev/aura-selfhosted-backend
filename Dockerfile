# node:22 Debian bookworm — glibc base required for better-sqlite3 native module.
# Do NOT switch to node:22-alpine (musl libc) — the native .node binary will not load.
#
# AppArmor note: Docker inside this privileged LXC container cannot load the
# docker-default AppArmor profile during build-time RUN steps. To work around
# this, node_modules are installed on the LXC host (glibc — same libc as this
# image) and copied in. This means: run `npm ci --omit=dev` in aura-selfhosted/
# on the host before rebuilding this image.
FROM node:22

WORKDIR /app

COPY package*.json ./
# node_modules pre-installed on the host to avoid AppArmor/LXC docker build failures.
# Host libc (glibc) matches this image (Debian bookworm), so native binaries are compatible.
COPY node_modules ./node_modules

COPY dist/ ./dist/

ENV PORT=3400
ENV AURA_DB_PATH=/data/aura.db

EXPOSE 3400

VOLUME ["/data"]

CMD ["node", "dist/server.js"]
