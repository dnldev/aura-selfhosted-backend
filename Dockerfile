FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

# Create data directory with correct permissions
RUN mkdir -p /data && chown node:node /data

USER node

ENV PORT=3400
ENV AURA_DB_PATH=/data/aura.db

EXPOSE 3400

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
