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

