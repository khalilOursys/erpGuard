# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build-time env
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js app
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

# Add non-root user
RUN addgroup -S nextgroup && adduser -S nextuser -G nextgroup

# Copy built files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

USER nextuser
EXPOSE 3000
CMD ["npm", "start"]
