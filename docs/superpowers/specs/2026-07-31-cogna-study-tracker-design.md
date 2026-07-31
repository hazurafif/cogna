# Cogna — Strava-like Study Tracker: Design Spec

Date: 2026-07-31
Status: Approved

## Purpose

Cogna is a personal study tracker inspired by Strava. Users log study sessions, track how much they study per subject, and see core stats (totals, weekly totals, streaks, subject breakdown). Personal tracker only — no social features.

## Technology Decisions

- **Monorepo** with `backend/` (Go) and `app/` (Expo React Native).
- **Backend**: Go, `chi` router, `modernc.org/sqlite` (pure Go, no CGO), JWT auth (bcrypt password hashing), REST JSON under `/api/v1`, SQL migrations embedded and run on startup.
- **Frontend**: Expo React Native with TypeScript; one codebase targeting iOS, Android, and web (`react-native-web`). `expo-router` for navigation.
- **Deployment**: local/self-hosted for v1. No cloud infra, no CORS complexity beyond localhost.

## Repo Layout

```
cogna/
├── backend/            # Go API server
│   ├── cmd/server/     # main entry
│   ├── internal/       # handlers, store, auth, middleware
│   └── migrations/     # SQL migration files
└── app/                # Expo React Native (iOS/Android/web)
    └── src/            # screens, api client, components, utils
```

## Data Model

SQLite at `backend/data/cogna.db`, foreign keys enabled, timestamps as RFC3339 strings.

### users
- `id` INTEGER PK autoincrement
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `created_at` TEXT NOT NULL

### subjects
- `id` INTEGER PK autoincrement
- `user_id` INTEGER NOT NULL (FK → users)
- `name` TEXT NOT NULL
- `color` TEXT NOT NULL (hex color for UI)
- `created_at` TEXT NOT NULL

### sessions
- `id` INTEGER PK autoincrement
- `user_id` INTEGER NOT NULL (FK → users)
- `subject_id` INTEGER NOT NULL (FK → subjects)
- `started_at` TEXT NOT NULL (RFC3339)
- `ended_at` TEXT NOT NULL (RFC3339)
- `duration_minutes` INTEGER NOT NULL (derived from start/end, stored for stats)
- `source` TEXT NOT NULL (`timer` | `manual`)
- `note` TEXT NULL
- `created_at` TEXT NOT NULL

## API

All routes under `/api/v1`, JSON bodies, JWT bearer auth except auth endpoints.

### Auth
- `POST /auth/register` — email, password → creates user, returns token + user
- `POST /auth/login` — email, password → returns token + user
- `GET /me` — returns current user

### Subjects
- `GET /subjects` — list current user's subjects
- `POST /subjects` — create (name, color)
- `PUT /subjects/:id` — update (name, color)
- `DELETE /subjects/:id` — delete

### Sessions
- `GET /sessions?from=&to=&subject_id=` — list with optional date/subject filters, ordered by started_at desc
- `POST /sessions` — create (started_at, ended_at, subject_id, note, source)
- `PUT /sessions/:id` — update
- `DELETE /sessions/:id` — delete

### Stats
- `GET /stats/summary` — total study time, this week's total, current streak (days with study, counting today), per-subject totals

## Frontend Design

- **Screens**: Login/Register → Home (stats + streak) → Active Session (timer) → History → Session detail/edit → Subjects.
- **Timer**: runs locally in the app; on stop the app POSTs the session with started_at/ended_at. No orphan sessions, no server-side timing.
- **Manual entry**: same `POST /sessions` endpoint with `source: manual`.
- **API client**: typed fetch wrapper; Bearer token stored in `expo-secure-store` (native) / localStorage (web); throws `ApiError` with code + message.
- **Auth flow**: register/login stores token; protected routes redirect to login; 401 triggers auto-logout.

## Error Handling

- Backend: JSON envelope `{"error": {"code": "...", "message": "..."}}`; statuses 400 (validation), 401, 404, 409 (duplicate email), 500. SQL details never leaked.
- Frontend: screens catch `ApiError` and show toast/inline error; network failures show retry option.

## Testing

- **Backend**: Go tests with in-memory SQLite — repository tests + handler tests (register/login, session CRUD, stats math). `go test ./...`.
- **Frontend**: Jest + React Native Testing Library — API client (mocked fetch), streak/totals utils, key screens (login form, timer start/stop).
- Manual: `go run` backend, then Expo web + iOS simulator.

## Out of Scope (v1)

No social/leaderboards, no goals/challenges, no charts, no offline sync, no password reset, no refresh tokens, no file uploads, no deployment infra.

## Milestones

1. Backend skeleton: migrations, auth, sessions, subjects, stats + tests
2. App skeleton: Expo setup, navigation, API client, auth screens
3. Core flows: timer → save session, manual entry, history, edit/delete
4. Dashboard stats + subjects management
5. Polish: validation, error states, web compatibility check
