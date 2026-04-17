#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# SMS Database Restore Script
# Usage: ./restore.sh [backup_file] [database_url]
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Default values
BACKUP_FILE="${1:-}"
DATABASE_URL="${2:-postgres://sms_user:sms_password@localhost:5432/sms_db}"

# Find latest .dump file if not specified
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -t "$SCRIPT_DIR"/*.dump 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: No .dump file found in $SCRIPT_DIR"
    echo "Usage: $0 <backup_file> [database_url]"
    exit 1
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "========================================="
echo " SMS Database Restore"
echo "========================================="
echo "Backup file : $BACKUP_FILE"
echo "Database URL: $DATABASE_URL"
echo "========================================="
echo ""
read -p "This will DROP and recreate data. Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# Extract DB name from URL for create step
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')

# Step 1: Create database if it doesn't exist
echo ""
echo "[1/3] Ensuring database '$DB_NAME' exists..."
PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|.*:([^@]+)@.*|\1|')
PGUSER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
PGHOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
PGPORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')

psql "postgres://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/postgres" -c "SELECT 'CREATE DATABASE \"$DB_NAME\"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec" 2>/dev/null || true

# Step 2: Run Prisma migrations to ensure schema
echo "[2/3] Running Prisma migrations..."
if [ -f "$(dirname "$SCRIPT_DIR")/prisma/schema.prisma" ] || [ -f "./prisma/schema.prisma" ]; then
  npx prisma migrate deploy 2>/dev/null || {
    echo "  Prisma migrate not available, continuing with restore..."
  }
else
  echo "  No Prisma schema found, skipping migrations..."
fi

# Step 3: Restore from backup
echo "[3/3] Restoring data from backup..."
pg_restore "$DATABASE_URL" \
  --clean --if-exists \
  --no-owner --no-acl \
  --verbose \
  "$BACKUP_FILE" 2>&1 | tail -5

echo ""
echo "========================================="
echo " Restore complete!"
echo "========================================="
echo "Run 'npx prisma generate' if needed."
echo ""