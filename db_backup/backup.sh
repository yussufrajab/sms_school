#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# SMS Database Backup Script
# Usage: ./backup.sh [database_url]
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATABASE_URL="${1:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set."
  echo "Usage: $0 <database_url>"
  echo "  or export DATABASE_URL=postgres://user:pass@host:5432/dbname"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$SCRIPT_DIR/sms_backup_${TIMESTAMP}.dump"

echo "Backing up to: $BACKUP_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists -F c -f "$BACKUP_FILE"

echo "Done! File size: $(du -h "$BACKUP_FILE" | cut -f1)"