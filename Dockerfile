# ── Stage 1: Build Client ──────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY client/ ./client/
COPY shared/ ./shared/

RUN pnpm --filter airshare-shared build 2>/dev/null || true
RUN pnpm --filter airshare-client build

# ── Stage 2: Build Server ──────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY server/ ./server/
COPY shared/ ./shared/

RUN pnpm --filter airshare-shared build 2>/dev/null || true
RUN pnpm --filter airshare-server build

# ── Stage 3: Production ────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built client
COPY --from=client-builder /app/client/dist ./public

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package.json ./server/

# Install production deps only
COPY package.json pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
RUN cd server && npm install --omit=dev 2>/dev/null || true

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server/dist/index.js"]
