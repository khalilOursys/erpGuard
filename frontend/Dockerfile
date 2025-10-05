# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
RUN apk add --no-cache git

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .

# Build next app
RUN npm run build

# Stage 2: runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -S nextgroup && adduser -S nextuser -G nextgroup

# copy production deps & built assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/next.config.js ./next.config.js

# copy any required files
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

USER nextuser
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/_next/ || exit 1

CMD ["npm", "run", "start"]
