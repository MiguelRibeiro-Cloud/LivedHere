#!/bin/bash
# ── entrypoint.sh ─────────────────────────────────────────────
# DB-tools container entrypoint.
# Modes:
#   listen   (default) — install triggers, then listen & auto-export
#   export              — run a single export and exit
#   restore             — restore from latest dump (or $1) and exit
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-listen}"

# Wait for PostgreSQL to be ready
echo "[db-tools] Waiting for PostgreSQL at $PGHOST:$PGPORT ..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" > /dev/null 2>&1; do
  sleep 2
done
echo "[db-tools] PostgreSQL is ready."

case "$MODE" in
  listen)
    echo "[db-tools] Installing NOTIFY triggers ..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
      -f "$SCRIPT_DIR/setup-triggers.sql" --quiet
    echo "[db-tools] Triggers installed."

    # Take an initial export on startup
    "$SCRIPT_DIR/export.sh"

    # Start the listener (blocks forever)
    exec "$SCRIPT_DIR/listen-and-export.sh"
    ;;
  export)
    exec "$SCRIPT_DIR/export.sh"
    ;;
  restore)
    exec "$SCRIPT_DIR/restore.sh" "${2:-}"
    ;;
  *)
    echo "Usage: entrypoint.sh {listen|export|restore [file]}"
    exit 1
    ;;
esac
