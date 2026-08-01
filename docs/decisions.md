# Cogna — Decisions

Single source of truth for project-wide technical and implementation decisions. Append new
decisions as they are made; never rewrite history.

## 2026-07-31

- **Stack** — Backend: Go (`chi`, `modernc.org/sqlite` pure-Go driver, JWT auth). Frontend:
  Expo React Native + TypeScript targeting iOS, Android, and web (`react-native-web`).
- **Monorepo layout** — `backend/` and `app/` in one repo, each independently buildable/testable.
- **Personal tracker only** — No social, goals, or challenges in v1.
- **Session recording** — Timer-based (local timer, POST on stop) and manual entry, both through
  `POST /sessions` with a `source` field (`timer`|`manual`).
- **One subject per session** — sessions reference exactly one subject; subject deletion is
  blocked (409) while sessions reference it.
- **Auth** — Email/password with bcrypt hashing; JWT bearer tokens (HS256, 24h expiry), no
  refresh tokens in v1.
- **Timestamps** — Stored as RFC3339 in SQLite (TEXT), server-local time; day boundaries for
  streaks/weekly stats computed server-side in server-local time. (Superseded: see Timestamp
  storage below — sessions normalize to offset-less local layout on write.)
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

## 2026-08-01

- **Air for live reload** — Backend dev uses `air` pinned as a Go tool directive
  (`go get -tool github.com/air-verse/air`, run via `go tool air`). Config lives in
  `backend/.air.toml`: builds `./cmd/server` into `backend/tmp/` (gitignored), watches `.go`
  files, cleans up on exit. No global installs; the tool version is tracked in `go.mod`.
- **RNTL v14 async APIs** — `@testing-library/react-native` v14 makes `render`, `renderHook`,
  `fireEvent`, and `act` async; tests must `await` them. Plan snippets written against the v13
  sync API were adapted during implementation.
- **Typed expo-router routes** — Href types are generated into `.expo/types/router.d.ts` (gitignored)
  by the dev server from existing route files; screens referencing routes created later (Task 13)
  therefore don't typecheck against stale generated types until the dev server regenerates them.
- **.env support** — the backend loads `backend/.env` via `joho/godotenv` at startup; a missing
  file is fine, real env vars take precedence, `.env` is gitignored, `.env.example` documents the
  vars.
- **@expo/vector-icons explicit dependency** — Expo SDK 57's `expo` package no longer bundles
  `@expo/vector-icons` (the dark-ui plan assumed it was bundled). It is an explicit dependency
  (`expo install @expo/vector-icons@^15.1.1`), used for Ionicons in the shared components.
- **lucide-react-native for icons** — UI now uses `lucide-react-native` (peer `react-native-svg`,
  installed via `expo install`) instead of `@expo/vector-icons`/Ionicons. Jest maps the package to
  its CJS build (`moduleNameMapper` in `app/package.json`) because the `react-native` export
  condition resolves to an untransformed `.mjs`; `transformIgnorePatterns` extends the jest-expo
  default with `lucide-react-native`.
- **Subjects use icons, not colors** — subjects carry an `icon` (kebab-case name from a fixed
  catalog in `app/src/constants/subjectIcons.ts`) instead of a hex `color`. The API validates
  `^[a-z0-9-]{1,40}$`; migration `0002` adds `subjects.icon` (default `book-open`) and drops
  `subjects.color`. The app renders icons via `SubjectIcon` (lookup falls back to `book-open`);
  per-subject bars/detail chrome use the single brand accent.
- **React Compiler lint** — `react-hooks/static-components` forbids resolving a component during
  render; `SubjectIcon` builds its element with `createElement` so the icon lookup is not treated
  as component creation.
- **Motivation layer for stats (2026-08-01)** — Home now shows a 7-day activity strip, a
  "Today's goal" progress bar (`DAILY_GOAL_MINUTES = 120`, a constant in `src/utils/daily.ts`),
  streak milestone badges (3/7/14/30 days) and forgiving streak copy. Aggregation logic lives in
  `src/utils/daily.ts` (pure, unit-tested); the strip is built from `listSessions` client-side
  rather than a new endpoint.
- **Session-complete celebration** — the timer shows a full-screen "Session saved!" overlay with a
  pulsing flame for 1.4s before navigating to History. Haptics (`expo-haptics`) fire on start and
  successful save via `src/utils/haptics.ts`, which no-ops safely outside native (and in Jest).
- **History grouped by day** — `SectionList` with Today/Yesterday/`Mon, Jul 27` headers and
  AM/PM start times; empty state with guidance. Subjects and History also gained empty states.
- **Design exploration write-up** — competitive/UX research for study-tracker apps (streak
  psychology from Trophy's 18M-streak dataset, Duolingo/Forest/Strava patterns) was done in
  chat; the implemented subset is the three quickest wins above. Streak design notes
  (days 3-7 critical, Friday = top break day, forgiving post-break copy) informed the copy.
- **Shared .env between backend and app** — `backend/.env` is the single source of truth for
  the API port. `app/scripts/backend-env.js` (plain CJS, unit-tested) parses it and spawns the
  Expo CLI with `EXPO_PUBLIC_API_PORT` set; `src/api/config.ts` derives the API URL from that
  port (`localhost` on web/iOS, `10.0.2.2` on Android). `EXPO_PUBLIC_API_URL` still wins when
  set. Run the app via `pnpm start`/`pnpm web` etc.; bare `npx expo start` skips the loader.

## 2026-08-01 (redesign-app-flow)

- **Strava-like 3-tab IA** — the app moves from 4 tabs (Home/Timer/History/Subjects) to 3
  (Home/Record/You). Home is a day-grouped timeline of your own sessions with a week summary
  card and today's goal bar; Record is "pick a subject, start, stop, save" with a secondary
  "Log without timer" manual form; You is the profile tab (identity, totals, streak heatmap
  calendar, subject breakdown, weekly chart, milestones). History and Subjects screens are
  gone; session detail/edit screens stay reachable from the timeline.
- **Fixed subject catalog** — per-user subject CRUD is removed. Migration `0003` creates a
  global `subject_catalog` seeded with 11 entries (math, science, language, programming,
  reading, writing, history, music, art, test-prep, other) and rebuilds `sessions`,
  mapping legacy subjects by case-insensitive name with a fallback to `other`. `GET
  /subjects` returns the catalog for any user; POST/PUT/DELETE return 404. Catalog names are
  kebab-case; the app maps them to display labels via `subjectLabel` in
  `app/src/constants/subjectIcons.ts`.
- **Client-side You-tab aggregation** — totals come from `GET /stats/summary`; everything
  else (best streak, per-day minutes for the heatmap, weekly totals) is derived from
  `listSessions` via pure helpers in `app/src/utils/daily.ts` (`bestStreak`,
  `minutesPerDay`, `weeklyTotals`, `monthHeatmap`, `heatIntensity`). No new endpoints.
- **Celebration lands on Home** — after a saved timer session the 1.4s celebration navigates
  to the Home tab (`router.navigate("/")`) so the new session is the newest timeline card
  (was `router.push("/(tabs)/history")`).
- **Timer state survives tab switches** — Expo Router keeps visited tabs mounted, so the
  Record timer's component state (startedAt, interval) keeps running across tab changes;
  `RecordScreen.test.tsx` locks this in with a rerender-survival test. App kill still loses
  the run (v1 behavior).
- **Manual log quick presets** — the manual session form offers 15/25/45/60-minute preset
  chips that set the minutes field.
