#!/usr/bin/env sh
set -e

DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}

# wait for postgres
echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
RETRIES=60
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1 || [ $RETRIES -le 0 ]; do
  echo "Postgres is unavailable - sleeping..."
  sleep 2
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -le 0 ]; then
  echo "Postgres did not become available in time."
  exit 1
fi

echo "Postgres is up."

# Apply migrations (recommended for production)
if [ "$PRISMA_MIGRATE" = "true" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  # safe fallback for dev: push schema (non-destructive for dev)
  echo "Running prisma db push..."
  npx prisma db push
fi

# ensure prisma client up to date (in case schema changed at runtime)
npx prisma generate

# run seed if requested
if [ "$RUN_SEED" = "true" ]; then
  echo "Running seed script..."
  # assumes you added "prisma:seed" script to package.json
  npm run prisma:seed || true
fi

echo "Starting server"
npm run start:prod
