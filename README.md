# Cogna

A Strava-like study tracker: log study sessions, track time per subject, keep your streak.

## Stack

- **backend/** — Go API (`chi`, SQLite, JWT). Single binary.
- **app/** — Expo React Native (TypeScript) for iOS, Android, and web.

## Prerequisites

- Go 1.26+ (backend)
- Node.js 20+ and pnpm (app)

## Run the backend

    cd backend
    cp .env.example .env   # then edit JWT_SECRET (min 32 characters)
    go run ./cmd/server

Listens on `:8080`. Config via a `.env` file (see `.env.example`) or env
vars: `PORT` (default 8080), `DATABASE_PATH` (default `data/cogna.db`),
`JWT_SECRET` (required, min 32 characters — the server refuses to start
without it). Real env vars take precedence over `.env` values.

## Run the app

    cd app
    pnpm install
    pnpm start

Press `w` for web, `i` for iOS simulator. `pnpm start` reads `backend/.env`
and passes its `PORT` to the app as `EXPO_PUBLIC_API_PORT`, so the web app
talks to the same port the backend listens on (Android emulator still uses
`http://10.0.2.2:<port>`). Set `EXPO_PUBLIC_API_URL` to override the base URL
entirely.

## Tests

- Backend: `go test ./...` (coverage gate ≥ 80%: `go test ./... -cover`)
- App: `pnpm test` (coverage gate ≥ 80%: `pnpm test -- --coverage`)

## Docs

- Decisions: `docs/decisions.md`
