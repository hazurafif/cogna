# Cogna

A Strava-like study tracker: log study sessions, track time per subject, keep your streak.

## Stack

- **backend/** — Go API (`chi`, SQLite, JWT). Single binary.
- **app/** — Expo React Native (TypeScript) for iOS, Android, and web.

## Prerequisites

- Go 1.26+ (backend)
- Node.js 20+ and npm (app)

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
    npm install
    npx expo start

Press `w` for web, `i` for iOS simulator. The web app expects the backend at
`http://localhost:8080` (Android emulator: `http://10.0.2.2:8080`) — set
`EXPO_PUBLIC_API_URL` to override.

## Tests

- Backend: `go test ./...` (coverage gate ≥ 80%: `go test ./... -cover`)
- App: `npm test` (coverage gate ≥ 80%: `npm test -- --coverage`)

## Docs

- Design spec: `docs/superpowers/specs/2026-07-31-cogna-study-tracker-design.md`
- Decisions: `docs/decisions.md`
