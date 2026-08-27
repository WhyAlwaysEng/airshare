# ── Stage 1: Build Client ──────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

# Use npm in Docker for better compatibility
RUN cd client && npm install
RUN cd shared && npm install 2>/dev/null || true

COPY client/ ./client/
COPY shared/ ./shared/

RUN cd client && npm run build

# ── Stage 2: Build Server ──────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN cd server && npm install

COPY server/ ./server/
COPY shared/ ./shared/

RUN cd server && npx tsc

# ── Stage 3: Production ────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/dist ./public

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package.json ./server/
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Copy shared types if needed
COPY shared/ ./shared/

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server/dist/index.js"]
