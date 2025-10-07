# server/Dockerfile - production build with proper ownership + seed support
FROM node:20-bullseye AS builder
WORKDIR /app

# copy package files early to leverage cache
COPY package*.json ./

# Install all deps (we need dev deps to compile seed and Nest)
RUN npm ci --no-audit --no-fund

# copy sources
COPY . .

# ensure folder for optional prisma runtime files exists so later COPY won't fail
RUN mkdir -p .prisma

# generate prisma client (so types exist for build)
RUN npx prisma generate

# build the app (Nest will emit dist/)
RUN npx nest build

# Compile prisma seed.ts to CommonJS in dist/prisma so node can run it:
# Ensure server/tsconfig.json includes prisma/seed.ts in "include"
RUN npx tsc prisma/seed.ts --module commonjs --outDir dist/prisma --target ES2019 --esModuleInterop --skipLibCheck

# --- final runtime image ---
FROM node:20-bullseye AS runtime
WORKDIR /app

# create user to avoid permission issues
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# copy built artifacts and package.json & node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# copy .prisma if present (we created it in builder to guarantee existence)
COPY --from=builder /app/.prisma ./.prisma

# create uploads dir and make it writable by runtime user
RUN mkdir -p /app/uploads /app/.prisma && \
    chown -R appuser:appgroup /app/uploads /app/node_modules /app/dist /app/prisma /app/.prisma || true && \
    chmod -R 0775 /app/uploads

# install tsconfig-paths (runtime module alias resolver)
RUN npm install --no-audit --no-fund tsconfig-paths

# switch to non-root user
USER appuser

# default run
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
