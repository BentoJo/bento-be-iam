# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# 1. Build stage — install ALL deps (incl. dev) and compile TS -> dist.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install with a clean, reproducible lockfile state.
COPY package*.json ./
RUN npm ci

# Compile. `nest build` also copies src/shared/proto/**/*.proto into
# dist/src/shared/proto (see nest-cli.json "assets"), which is exactly where
# main.ts resolves them at runtime: join(__dirname='dist/src', '../src/shared/proto').
COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# 2. Runner stage — PROD deps only + compiled output. Runs as non-root.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Production dependencies only (no dev toolchain in the final image).
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled app. `dist` already contains the .proto assets at
# dist/src/shared/proto/ — the path main.ts loads from.
COPY --from=builder /app/dist ./dist

# Drizzle config (migrations are run manually; no migrations dir is checked in yet).
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Belt-and-suspenders: also place the raw protos at the runtime-resolved path,
# so the gRPC server boots even if the nest asset copy ever changes.
# (DO NOT remove the protos — the gRPC server loads them at startup.)
COPY --from=builder /app/src/shared/proto ./dist/src/shared/proto

# Run as the built-in unprivileged `node` user.
RUN chown -R node:node /app
USER node

# gRPC (50052) + HTTP (5001).
EXPOSE 50052
EXPOSE 5001

# HEALTHCHECK against the HTTP transport on 5001. The IAM service exposes HTTP,
# so a TCP-level connect to the port is a cheap, dependency-free liveness probe
# (no curl/wget needed in the alpine image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('net').connect(5001,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
