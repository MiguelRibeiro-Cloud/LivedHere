# LivedHere MVP

Know before you move. Because where you live matters.

This repository contains a production-minded MVP for **LivedHere** using:

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- Passwordless magic link auth
- Locale routing with English + Portuguese (`/en`, `/pt`)
- Admin moderation workflow (approve/reject/request changes/remove)
- Leaflet + OpenStreetMap map browse

## Repo structure

- `frontend/`: Next.js application, Prisma schema/migrations, tests
- `docker-compose.yml`: app + PostgreSQL local stack
- `.env.example`: required/optional runtime config

## Local setup

1. Copy environment file:

	- `copy .env.example .env` (Windows PowerShell)

2. Start stack:

	- `docker compose up --build`

3. Open app:

	- `http://localhost:3000/en`

The app container runs Prisma migrations and seed at startup.

## Useful commands (inside `frontend/`)

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run test`

## Default seeded data

- Country: Portugal (`PT`)
- City/Area/Street sample for Lisboa
- Sample building with coordinates
- One approved demo review
- Admin user from `ADMIN_EMAIL`

## Auth and email

- Login is passwordless via magic links.
- Tokens are high-entropy, hashed in DB, single-use, and expire in 15 minutes.
- Sessions are `httpOnly`, `sameSite=lax`, `secure` in production.
- Dev mode (`SEND_REAL_EMAIL=false`) logs magic link to server logs and returns a dev-link response.

## Security features included

- Zod input validation for writes
- PII heuristic scanner (email/phone/handles/unit identifiers)
- Rate limits for review submissions:
  - max 5/IP per 24h
  - max 5/building per 24h
  - max 3/fingerprint per 24h
- Optional captcha verification (`none`, `turnstile`, `recaptcha`)
- Basic CSP + hardening headers
- Admin audit logs for moderation actions

## Main routes

Public:

- `/en` `/pt`
- `/[locale]/search`
- `/[locale]/map`
- `/[locale]/places/[buildingId]`
- `/[locale]/submit`
- `/[locale]/review-status/[trackingCode]`

Auth/account:

- `/[locale]/auth/login`
- `/[locale]/auth/callback`
- `/[locale]/account`
- `/[locale]/account/delete`

Admin:

- `/[locale]/admin`
- `/[locale]/admin/reviews`
- `/[locale]/admin/reviews/[id]`
- `/[locale]/admin/places`
- `/[locale]/admin/users`

## Notes

- Reviews are always pre-moderated and public only after approval.
- User-generated comments are rendered as plain text.
- Anonymous submissions receive tracking code and edit-token link support for change requests.
