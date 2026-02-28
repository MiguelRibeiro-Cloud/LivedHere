# LivedHere (Python + React + Postgres)

**Know before you move. Because where you live matters.**

This repository contains a production-minded MVP for LivedHere using a monorepo stack:

- Backend: FastAPI + SQLAlchemy async + Alembic + PostgreSQL
- Frontend: React (Vite) + React Router + Tailwind + react-i18next
- Maps: Leaflet + OpenStreetMap
- Infrastructure: Docker + docker-compose (`api`, `web`, `db`)

## Repository structure

- `backend/`: FastAPI app, SQLAlchemy models, Alembic migration, seed script, pytest suite
- `frontend/`: Vite React app with i18n, map, review flows, admin pages
- `Dockerfile.api`: backend image
- `Dockerfile.web`: frontend image
- `docker-compose.yml`: local environment orchestration

## Features implemented

- Anonymous and authenticated review submission
- Pre-moderation workflow: pending → approve/reject/request changes/remove
- Passwordless magic-link authentication with JWT session cookie
- Verified badge for logged-in users
- Rule-based PII scanning (email, phone, handles, exact unit hints)
- Rolling 24-hour rate limits (IP/building/fingerprint)
- Public reporting flow and admin report list
- Search + building details + map endpoint
- Bilingual UI (English and Portuguese Portugal)

## Quick start

1. Copy env file:
	- Windows PowerShell: `Copy-Item .env.example .env`
2. Start everything:
	- `docker compose up --build`
3. Open apps:
	- Frontend: `http://localhost:5173/en`
	- API health: `http://localhost:8000/health`

The API container automatically runs:
- `alembic upgrade head`
- seed script (`python -m app.core.seed`)

## Environment variables

Required values are documented in `.env.example`.

Most important:
- `DATABASE_URL`
- `JWT_SECRET`
- `APP_URL`
- `SEND_REAL_EMAIL`
- `CAPTCHA_PROVIDER` (`none`, `turnstile`, `recaptcha`)
- `ADMIN_EMAIL`

## Auth behavior

- `POST /auth/request-link` creates a single-use 15-minute token
- Token is hashed in DB (`magic_link_tokens`)
- `GET /auth/callback` validates token, provisions user (or reuses existing), sets `lh_session` cookie
- In dev mode (`SEND_REAL_EMAIL=false`), the link is logged and returned as `dev_link`

## API overview

Auth:
- `POST /auth/request-link`
- `GET /auth/callback`
- `POST /auth/logout`

User:
- `GET /me`
- `DELETE /me`

Places:
- `GET /countries`
- `GET /cities`
- `GET /areas`
- `GET /streets`
- `POST /places/create`

Reviews:
- `POST /reviews`
- `GET /reviews/{id}`
- `PUT /reviews/{id}`
- `GET /review-status/{code}`

Admin:
- `GET /admin/reviews`
- `POST /admin/reviews/{id}/approve`
- `POST /admin/reviews/{id}/reject`
- `POST /admin/reviews/{id}/request-changes`
- `POST /admin/reviews/{id}/remove`

Reports:
- `POST /reports`
- `GET /admin/reports`

Search & map:
- `GET /search`
- `GET /buildings/{id}`
- `GET /map/buildings`

## Seed data

Seed script creates:
- Portugal (`PT`)
- Lisboa and Porto examples with one sample building each
- Admin user from `ADMIN_EMAIL`

## Tests

Backend tests included:
- PII scanner logic
- Rate limit rule logic
- Review state transitions

Run tests from backend container or local backend environment:
- `pytest -q`

## Security notes

- Pydantic validation for request payloads
- No HTML rendering of user comments
- Admin routes protected via role guard
- CSP and common security headers set in middleware
- Secrets loaded from environment

## Database dump / restore (db-tools)

A sidecar container (`db-tools`) automatically exports a full PostgreSQL dump whenever data changes, and can restore the latest dump when deploying to a new environment.

### How it works

| Component | Purpose |
|---|---|
| `db-tools/setup-triggers.sql` | Installs PostgreSQL `AFTER INSERT/UPDATE/DELETE` triggers on all data tables. Each trigger fires `pg_notify('db_data_changed', <table>)` |
| `db-tools/listen-and-export.sh` | Long-running psql LISTEN session that calls `export.sh` when a notification arrives (with 30 s debounce) |
| `db-tools/export.sh` | Runs `pg_dump --format=custom` → `/dumps/livedhere_<timestamp>.dump`, updates a `latest.dump` symlink, prunes old dumps (keeps 10) |
| `db-tools/restore.sh` | Drops public schema and runs `pg_restore` from the latest (or specified) dump file |
| `db-tools/entrypoint.sh` | Container entrypoint — installs triggers, takes an initial export, then starts the listener |

### Architecture

```
┌────────────┐   NOTIFY    ┌──────────────┐   pg_dump     ┌───────────┐
│ PostgreSQL │ ──────────► │  db-tools    │ ───────────► │  /dumps   │
│ (triggers) │             │  (listener)  │              │  (volume) │
└────────────┘             └──────────────┘              └───────────┘
```

Dumps are stored in the `db_dumps` Docker volume, mapped to `/dumps` inside the container.

### Quick start

Everything starts automatically with Docker Compose:

```bash
docker compose up --build
```

The `db-tools` container will:
1. Wait for PostgreSQL + API (migrations) to be healthy
2. Install NOTIFY triggers on data tables
3. Run an initial full export
4. Listen for changes and auto-export (debounced at 30 s)

### Manual export

```bash
# From the running container
docker exec livedhere-db-tools /db-tools/entrypoint.sh export

# Or as a one-off container
docker compose run --rm db-tools export
```

### Restore to a new environment

```bash
# 1. Copy the dumps volume or directory to the new host.

# 2. Start only the database:
docker compose up -d db

# 3. Wait for it to be healthy, then restore:
docker compose run --rm db-tools restore

# 4. (Optional) restore a specific dump instead of the latest:
docker compose run --rm db-tools restore /dumps/livedhere_20260228_120000.dump

# 5. Start the rest of the stack:
docker compose up -d
```

### Accessing dump files

```bash
# List dumps inside the volume
docker exec livedhere-db-tools ls -lh /dumps/

# Copy the latest dump to your host
docker cp livedhere-db-tools:/dumps/latest.dump ./latest.dump
```

### Bind-mount for easy backup (optional)

Replace the named volume with a host directory by overriding in `docker-compose.override.yml`:

```yaml
services:
  db-tools:
    volumes:
      - ./backups:/dumps
```

This makes dumps directly accessible on the host filesystem for cloud backup (Azure Blob, S3, etc.).

### Azure / cloud deployment notes

- **Azure Container Apps / App Service**: Mount an Azure File Share at `/dumps` for persistent, cross-deploy storage. Set the `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` environment variables to point at your Azure Database for PostgreSQL.
- **Azure Blob Storage**: Add an `azcopy` or `az storage blob upload` step to `export.sh` to automatically push each dump to blob storage.
- **Restore on deploy**: Run `docker compose run --rm db-tools restore` as a deployment step before starting the API, or include it in a CI/CD pipeline.
- The debounce interval can be tuned via the `DEBOUNCE_SECONDS` environment variable (default: 30).

### Configuration

| Variable | Default | Description |
|---|---|---|
| `DEBOUNCE_SECONDS` | `30` | Minimum seconds between consecutive exports |
| `DUMP_DIR` | `/dumps` | Directory where dump files are written |
| `PGHOST` | `db` | PostgreSQL hostname |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | from `.env` | PostgreSQL username |
| `PGPASSWORD` | from `.env` | PostgreSQL password |
| `PGDATABASE` | from `.env` | PostgreSQL database name |

