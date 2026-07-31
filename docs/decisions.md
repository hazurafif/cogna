# Cogna — Decisions

Single source of truth for project-wide technical and implementation decisions. Append new
decisions as they are made; never rewrite history.

## 2026-07-31

- **Stack** — Backend: Go (`chi`, `modernc.org/sqlite` pure-Go driver, JWT auth). Frontend:
  Expo React Native + TypeScript targeting iOS, Android, and web (`react-native-web`).
- **Monorepo layout** — `backend/` and `app/` in one repo, each independently buildable/testable.
- **Personal tracker only** — No social, goals, or challenges in v1. Scope per
  `docs/superpowers/specs/2026-07-31-cogna-study-tracker-design.md`.
- **Session recording** — Timer-based (local timer, POST on stop) and manual entry, both through
  `POST /sessions` with a `source` field (`timer`|`manual`).
- **One subject per session** — sessions reference exactly one subject; subject deletion is
  blocked (409) while sessions reference it.
- **Auth** — Email/password with bcrypt hashing; JWT bearer tokens (HS256, 24h expiry), no
  refresh tokens in v1.
- **Timestamps** — Stored as RFC3339 in SQLite (TEXT), server-local time; day boundaries for
  streaks/weekly stats computed server-side in server-local time.
- **Timestamp storage** — session timestamps are normalized to offset-less local layout
  (2006-01-02T15:04:05) on write; RFC3339 input is accepted and its offset dropped, preserving
  the client's wall clock (server-local day semantics for stats).
- **Migrations** — Append-only, numbered SQL files (`0001_init.sql`, ...), embedded in the
  binary via `embed` and applied on startup.
- **Local-first deployment** — No cloud infra for v1; backend runs locally on `:8080`.
- **Go toolchain** — Upgraded to go1.26.5 (2026-07-31) via Homebrew; go.mod should track the
  stable release.
- **JWT hardening** — HS256 only (`jwt.WithValidMethods`), JWT_SECRET must be ≥ 32 characters or
  the server refuses to start (no default secret).
- **Login anti-enumeration** — login performs a dummy bcrypt verification for unknown emails so
  response timing does not reveal account existence; register still returns 409 on duplicate
  email (accepted tradeoff; rate limiting deferred).
- **Password limits** — passwords must be 8–72 bytes (bcrypt's input limit).
- **Stats test arithmetic** — plan test expectations corrected during implementation (total 330,
  week 270, Math 210); handler-level stats test uses time.Now()-relative dates so it passes on any
  run date.
- **CORS** — wildcard origins with AllowCredentials=false (safe combo for bearer-token auth) via
  go-chi/cors, enabling the Expo web dev server to call the API.
- **Data directory** — store.Open creates the DB parent directory (MkdirAll 0755) so a fresh clone
  runs out of the box with the default data/cogna.db path.
