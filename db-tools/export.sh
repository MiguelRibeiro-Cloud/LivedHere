#!/bin/bash
# ── export.sh ─────────────────────────────────────────────────
# Creates a timestamped PostgreSQL dump in /dumps.
# Usage:  ./export.sh
# Env:    PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# ──────────────────────────────────────────────────────────────
set -euo pipefail

DUMP_DIR="${DUMP_DIR:-/dumps}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
DUMP_FILE="${DUMP_DIR}/livedhere_${TIMESTAMP}.dump"
LATEST_LINK="${DUMP_DIR}/latest.dump"

mkdir -p "$DUMP_DIR"

echo "[export] $(date -u +"%Y-%m-%d %H:%M:%S UTC") — Starting database export..."

pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

# Update the "latest" symlink
ln -sf "$DUMP_FILE" "$LATEST_LINK"

# Prune old dumps — keep the 10 most recent
ls -1t "${DUMP_DIR}"/livedhere_*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "[export] Done → $DUMP_FILE ($SIZE)"
