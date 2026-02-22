# FeralLobster Bot Runtime Dockerfile
# Multi-stage build for production deployment

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libsodium-dev \
    gpg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libsodium-dev \
    gpg

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY package*.json tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    libsodium \
    gpg \
    curl

# Create non-root user
RUN addgroup -g 1001 -S feral && \
    adduser -u 1001 -S feral -G feral

WORKDIR /app

# Copy built application
COPY --from=builder --chown=feral:feral /app/dist ./dist
COPY --from=builder --chown=feral:feral /app/node_modules ./node_modules
COPY --from=builder --chown=feral:feral /app/package*.json ./

# Create directories for memory and logs
RUN mkdir -p /app/memory /app/logs /app/exports && \
    chown -R feral:feral /app

# Switch to non-root user
USER feral

# Set environment
ENV NODE_ENV=production
ENV BOT_MEMORY_PATH=/app/memory
ENV BOT_LOG_PATH=/app/logs/bot.log
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Pre-stop hook for graceful shutdown
STOPSIGNAL SIGTERM

# Entrypoint script
COPY --chown=feral:feral docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/lifecycle/Survival.js"]
