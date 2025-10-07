# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci  # Faster, cleaner install

COPY . .

RUN npx prisma generate

# Compile seed.ts to JS (inline flags only—no project/tsconfig for single file)
RUN mkdir -p prisma/dist && \
    npx tsc prisma/seed.ts \
    --target es2020 \
    --module commonjs \
    --outDir prisma/dist \
    --lib es2020 \
    --esModuleInterop \
    --skipLibCheck \
    --strict false  # Loosens for seed script (no types needed)

RUN npm run build
# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# FIXED: Copy prisma (includes compiled seed.js)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/dist/seed.js && npm run start:prod"]
