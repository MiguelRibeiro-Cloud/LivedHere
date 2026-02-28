-- ── setup-triggers.sql ───────────────────────────────────────
-- Installs a generic NOTIFY trigger on every data table so the
-- listener can auto-export the database after INSERTs.
--
-- Safe to re-run (idempotent: CREATE OR REPLACE / IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────

-- 1. Generic trigger function: fires pg_notify('db_data_changed', <table>)
CREATE OR REPLACE FUNCTION notify_data_changed()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_data_changed', TG_TABLE_NAME);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper: attach the trigger to a table (skip if it already exists)
CREATE OR REPLACE FUNCTION attach_change_trigger(tbl TEXT)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_data_changed_' || tbl
      AND tgrelid = tbl::regclass
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER trg_data_changed_%I
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed()',
      tbl, tbl
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers to all application data tables
--    (excludes transient tables: magic_link_tokens, sessions, alembic_version)
SELECT attach_change_trigger(t) FROM unnest(ARRAY[
  'users',
  'countries',
  'cities',
  'areas',
  'streets',
  'street_segments',
  'buildings',
  'reviews',
  'review_edits',
  'reports'
]) AS t;

-- Clean up helper
DROP FUNCTION IF EXISTS attach_change_trigger(TEXT);
