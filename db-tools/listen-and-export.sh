#!/bin/bash
# ── listen-and-export.sh ──────────────────────────────────────
# Listens for PostgreSQL NOTIFY events on the "db_data_changed"
# channel and triggers an export, with debounce logic to prevent
# rapid-fire dumps when many writes happen in a short window.
#
# Env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#      DEBOUNCE_SECONDS (default: 30)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEBOUNCE="${DEBOUNCE_SECONDS:-30}"
LAST_EXPORT_FILE="/tmp/.last_export_ts"
echo "0" > "$LAST_EXPORT_FILE"

do_export() {
  local NOW LAST_EXPORT ELAPSED
  NOW=$(date +%s)
  LAST_EXPORT=$(cat "$LAST_EXPORT_FILE")
  ELAPSED=$(( NOW - LAST_EXPORT ))

  if [ "$ELAPSED" -lt "$DEBOUNCE" ]; then
    echo "[listener] Change detected — debouncing (${ELAPSED}s < ${DEBOUNCE}s cooldown)"
    return
  fi

  echo "$NOW" > "$LAST_EXPORT_FILE"
  "$SCRIPT_DIR/export.sh"
}

echo "[listener] Listening for data changes on channel 'db_data_changed' (debounce=${DEBOUNCE}s) ..."

# Keep psql alive with a continuous stdin feed.
# The LISTEN command subscribes, then periodic empty lines keep the
# connection open so asynchronous notifications are received.
{
  echo "LISTEN db_data_changed;"
  while true; do
    sleep 5
    echo ""          # empty statement keeps psql alive
  done
} | psql \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --no-align --tuples-only 2>&1 \
| while IFS= read -r line; do
    # psql prints: Asynchronous notification "db_data_changed" received from ...
    if echo "$line" | grep -qi "db_data_changed"; then
      do_export
    fi
  done
