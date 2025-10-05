# -------------------------
# Stage 1: builder (deps + build)
# -------------------------
FROM node:20-alpine AS builder

# Install build deps including postgres client used by wait scripts
RUN apk add --no-cache bash git openssh build-base python3 postgresql-client

WORKDIR /usr/src/app

# copy only package manifests first (leverage cache)
COPY package.json package-lock.json ./

# Install deps (full)
RUN npm ci --silent

# copy source
COPY . .

# Prisma: generate client (so prisma client will be available at build time)
RUN npm run prisma:generate || true

# Build the project (Nest -> dist)
RUN npm run build

# -------------------------
# Stage 2: runtime (small)
# -------------------------
FROM node:20-alpine AS runner

# Install runtime tools (postgres client for health/wait)
RUN apk add --no-cache bash postgresql-client

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3001

# Copy package.json and production node_modules from builder
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy built files & prisma schema/client if required
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Copy entrypoint
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to non-root user
USER appuser

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

CMD ["bash", "/usr/local/bin/entrypoint.sh"]
