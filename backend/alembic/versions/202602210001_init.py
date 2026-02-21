"""initial schema

Revision ID: 202602210001
Revises:
Create Date: 2026-02-21 00:01:00
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "202602210001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.execute("CREATE TYPE userrole AS ENUM ('USER','ADMIN');")
    op.execute("CREATE TYPE authortype AS ENUM ('ANONYMOUS','USER');")
    op.execute("CREATE TYPE authorbadge AS ENUM ('NONE','VERIFIED_ACCOUNT');")
    op.execute("CREATE TYPE reviewstatus AS ENUM ('PENDING','APPROVED','REJECTED','CHANGES_REQUESTED','REMOVED');")
    op.execute("CREATE TYPE editortype AS ENUM ('ANONYMOUS','USER','ADMIN');")
    op.execute("CREATE TYPE reportreason AS ENUM ('PII','Harassment','FalseInfo','Spam','Other');")

    op.execute(
        """
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(320) UNIQUE NOT NULL,
          role userrole NOT NULL DEFAULT 'USER',
          deleted_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX ix_users_email ON users(email);")

    op.execute(
        """
        CREATE TABLE magic_link_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(320) NOT NULL,
          token_hash VARCHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_mlt_email ON magic_link_tokens(email);")
    op.execute("CREATE INDEX ix_mlt_token_hash ON magic_link_tokens(token_hash);")

    op.execute(
        """
        CREATE TABLE sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_sessions_user_id ON sessions(user_id);")
    op.execute("CREATE INDEX ix_sessions_token_hash ON sessions(token_hash);")

    op.execute(
        """
        CREATE TABLE countries (
          id SERIAL PRIMARY KEY,
          code VARCHAR(2) UNIQUE NOT NULL,
          name_en VARCHAR(120) NOT NULL,
          name_pt VARCHAR(120) NOT NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE cities (
          id SERIAL PRIMARY KEY,
          country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
          name VARCHAR(120) NOT NULL,
          normalized_name VARCHAR(120) NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_city_normalized_name ON cities(normalized_name);")

    op.execute(
        """
        CREATE TABLE areas (
          id SERIAL PRIMARY KEY,
          city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
          name VARCHAR(120) NOT NULL,
          normalized_name VARCHAR(120) NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_area_normalized_name ON areas(normalized_name);")

    op.execute(
        """
        CREATE TABLE streets (
          id SERIAL PRIMARY KEY,
          area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
          name VARCHAR(160) NOT NULL,
          normalized_name VARCHAR(160) NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_street_normalized_name ON streets(normalized_name);")

    op.execute(
        """
        CREATE TABLE street_segments (
          id SERIAL PRIMARY KEY,
          street_id INTEGER NOT NULL REFERENCES streets(id) ON DELETE CASCADE,
          start_number INTEGER NOT NULL,
          end_number INTEGER NOT NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE buildings (
          id SERIAL PRIMARY KEY,
          street_id INTEGER NOT NULL REFERENCES streets(id) ON DELETE CASCADE,
          segment_id INTEGER NULL REFERENCES street_segments(id) ON DELETE SET NULL,
          street_number INTEGER NOT NULL,
          building_name VARCHAR(160) NULL,
          lat NUMERIC(10,7) NOT NULL,
          lng NUMERIC(10,7) NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_building_street_number ON buildings(street_id, street_number);")

    op.execute(
        """
        CREATE TABLE reviews (
          id SERIAL PRIMARY KEY,
          building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          author_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
          author_type authortype NOT NULL DEFAULT 'ANONYMOUS',
          author_badge authorbadge NOT NULL DEFAULT 'NONE',
          status reviewstatus NOT NULL DEFAULT 'PENDING',
          tracking_code VARCHAR(24) UNIQUE NOT NULL,
          edit_token_hash VARCHAR(64) NOT NULL,
          edit_token_expires_at TIMESTAMPTZ NOT NULL,
          language_tag VARCHAR(8) NOT NULL,
          lived_from_year INTEGER NOT NULL,
          lived_to_year INTEGER NOT NULL,
          lived_duration_months INTEGER NOT NULL,
          people_noise INTEGER NOT NULL,
          animal_noise INTEGER NOT NULL,
          insulation INTEGER NOT NULL,
          pest_issues INTEGER NOT NULL,
          area_safety INTEGER NOT NULL,
          neighbourhood_vibe INTEGER NOT NULL,
          outdoor_spaces INTEGER NOT NULL,
          parking INTEGER NOT NULL,
          building_maintenance INTEGER NOT NULL,
          construction_quality INTEGER NOT NULL,
          overall_score NUMERIC(4,2) NOT NULL,
          overall_score_rounded INTEGER NOT NULL,
          comment TEXT NOT NULL,
          pii_flagged BOOLEAN NOT NULL DEFAULT FALSE,
          pii_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          approved_at TIMESTAMPTZ NULL,
          moderation_message TEXT NULL,
          moderated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_review_status_building ON reviews(status, building_id);")
    op.execute("CREATE INDEX ix_review_created_at ON reviews(created_at);")

    op.execute(
        """
        CREATE TABLE review_edit_history (
          id SERIAL PRIMARY KEY,
          review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
          before_json JSONB NOT NULL,
          after_json JSONB NOT NULL,
          editor_type editortype NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE reports (
          id SERIAL PRIMARY KEY,
          review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
          reporter_type VARCHAR(16) NOT NULL,
          reporter_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
          reason reportreason NOT NULL,
          details TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          resolved_at TIMESTAMPTZ NULL,
          resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE rate_limit_events (
          id SERIAL PRIMARY KEY,
          ip VARCHAR(64) NOT NULL,
          fingerprint VARCHAR(64) NOT NULL,
          building_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          type VARCHAR(40) NOT NULL
        );
        """
    )
    op.execute("CREATE INDEX ix_rate_limit_events_ip ON rate_limit_events(ip);")
    op.execute("CREATE INDEX ix_rate_limit_events_fingerprint ON rate_limit_events(fingerprint);")
    op.execute("CREATE INDEX ix_rate_limit_events_building_id ON rate_limit_events(building_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS rate_limit_events;")
    op.execute("DROP TABLE IF EXISTS reports;")
    op.execute("DROP TABLE IF EXISTS review_edit_history;")
    op.execute("DROP TABLE IF EXISTS reviews;")
    op.execute("DROP TABLE IF EXISTS buildings;")
    op.execute("DROP TABLE IF EXISTS street_segments;")
    op.execute("DROP TABLE IF EXISTS streets;")
    op.execute("DROP TABLE IF EXISTS areas;")
    op.execute("DROP TABLE IF EXISTS cities;")
    op.execute("DROP TABLE IF EXISTS countries;")
    op.execute("DROP TABLE IF EXISTS sessions;")
    op.execute("DROP TABLE IF EXISTS magic_link_tokens;")
    op.execute("DROP TABLE IF EXISTS users;")

    op.execute("DROP TYPE IF EXISTS reportreason;")
    op.execute("DROP TYPE IF EXISTS editortype;")
    op.execute("DROP TYPE IF EXISTS reviewstatus;")
    op.execute("DROP TYPE IF EXISTS authorbadge;")
    op.execute("DROP TYPE IF EXISTS authortype;")
    op.execute("DROP TYPE IF EXISTS userrole;")
