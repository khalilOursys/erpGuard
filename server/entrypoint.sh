#!/usr/bin/env bash
set -e

# allow docker to override
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
# DATABASE_URL should be present in env, e.g. postgresql://user:pass@db:5432/dbname
: "${DATABASE_URL:?DATABASE_URL must be set}"

# Wait for Postgres (uses pg_isready from postgresql-client)
echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."
attempts=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  attempts=$((attempts+1))
  if [ $attempts -ge 60 ]; then
    echo "Postgres did not become available after 60s"
    exit 1
  fi
  sleep 1
done

echo "Postgres is available."

# Run prisma migrations if configured
if [ -x "$(command -v npx)" ]; then
  echo "Running prisma generate (safe) and migrate (if configured)..."
  # generate client (idempotent)
  npm run prisma:generate || true

  # Deploy migrations in production if script exists
  if npm run | grep -q "prisma:migrate:deploy"; then
    echo "Running prisma:migrate:deploy..."
    npm run prisma:migrate:deploy || {
      echo "Prisma migrate failed (non-zero). Exiting."
      exit 1
    }
  else
    echo "No prisma:migrate:deploy script found; skipping migration step."
  fi
fi

# Start app (production)
echo "Starting app..."
exec npm run start:prod
