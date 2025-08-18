#!/usr/bin/env sh
set -e

echo "ENTRYPOINT: waiting for database..."

# prefer explicit env vars set in .env
DB_URL="${DATABASE_URL:-}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

# If DATABASE_URL present, try to parse host/port (fallback)
if [ -n "$DB_URL" ]; then
  # attempt simple extraction if host not provided
  if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "db" ]; then
    # parse host between @ and :
    EXTRACTED_HOST=$(echo "$DB_URL" | sed -n 's#.*@\(.*\):\([0-9]*\)/.*#\1#p' || true)
    if [ -n "$EXTRACTED_HOST" ]; then DB_HOST="$EXTRACTED_HOST"; fi
  fi
fi

# Wait loop using pg_isready if available, else use nc
RETRIES=60
SLEEP=2

while [ $RETRIES -gt 0 ]; do
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1 && break
  else
    if command -v nc >/dev/null 2>&1; then
      nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1 && break
    else
      echo "No pg_isready or nc available; sleeping and retrying..." >&2
    fi
  fi

  echo "Postgres is unavailable at ${DB_HOST}:${DB_PORT} - retrying in ${SLEEP}s..."
  RETRIES=$((RETRIES - 1))
  sleep $SLEEP
done

if [ $RETRIES -le 0 ]; then
  echo "Postgres did not become available in time."
  exit 1
fi

echo "Database is available — running Prisma and starting server"

# Prisma generate and push
npx prisma generate
npx prisma db push

# Build and start
npm run build
npm run start:prod
