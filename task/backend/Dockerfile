# ─────────────────────────────────────────────────────────────
# backend/Dockerfile — production image for CollabCode API.
#
# Two stages keep the runtime image small:
#   1. builder — install all deps (incl. dev) and run prisma generate
#   2. runtime — slim node:20-alpine with only prod deps + generated client
#
# IMPORTANT: this image runs the API server itself. The sandbox
# Docker runner (src/lib/runner.js) talks to the HOST docker
# daemon via /var/run/docker.sock — bind-mount it at runtime.
# ─────────────────────────────────────────────────────────────

# ─── builder ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# OS deps: openssl for prisma engines, tini for clean signal handling.
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# ─── runtime ────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat tini

ENV NODE_ENV=production
ENV PORT=4000

# Copy generated prisma client + production deps.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma
COPY --from=builder /app/src          ./src
COPY --from=builder /app/package*.json ./

# Drop privileges. The runtime user must be added to the docker
# group at runtime if you want sandbox execution — Fly machines
# already grant socket access via the bind-mount.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 4000

# tini = PID 1, handles SIGTERM cleanly for graceful shutdown.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
