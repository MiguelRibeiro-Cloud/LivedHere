#!/bin/bash
# ── restore.sh ────────────────────────────────────────────────
# Restores the PostgreSQL database from the latest (or specified) dump.
# Usage:
#   ./restore.sh               # restore latest.dump
#   ./restore.sh <file.dump>   # restore a specific dump
# Env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# ──────────────────────────────────────────────────────────────
set -euo pipefail

DUMP_DIR="${DUMP_DIR:-/dumps}"
DUMP_FILE="${1:-${DUMP_DIR}/latest.dump}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "[restore] No dump file found at $DUMP_FILE — skipping restore."
  exit 0
fi

echo "[restore] $(date -u +"%Y-%m-%d %H:%M:%S UTC") — Restoring from $DUMP_FILE ..."

# Drop and recreate public schema for a clean restore
psql \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --command="DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

pg_restore \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$DUMP_FILE"

echo "[restore] Done — database restored successfully."
