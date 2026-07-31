# AGENTS.md — Cogna

Working conventions and the dev workflow for anyone (humans or AI agents) touching this repo.
Read it before making changes. For *what* the system is and *why* it is built this way, follow the
specs below — don't duplicate that material here.

## Conventions

- **English only.** All docs, code, comments, commit messages and identifiers are in English.
- **Record decisions as you make them.** Any project-wide choice (stack, tooling, naming, process,
  architectural default, notable implementation decision) goes in [`docs/decisions.md`](docs/decisions.md)
  as part of the same change — it is the single source of truth for those.
- **Design first.** Feature work starts from a spec in `docs/superpowers/specs/` and an implementation
  plan in `docs/superpowers/plans/` (superpowers workflow). Follow the plan task-by-task; never skip
  ahead or freelance beyond the current task.
- Keep `README.md` in sync with anything a new contributor must know to run the project.

## Repo layout

- `backend/` — Go API server (`chi`, SQLite via `modernc.org/sqlite`, JWT auth). Single binary.
- `app/` — Expo React Native app (TypeScript), targeting iOS, Android and web (`react-native-web`).
- `docs/` — specs, plans, decisions.

## Dev workflow

- **Backend** (from `backend/`):
  - Run: `go run ./cmd/server` (listens on `:8080` by default)
  - Test: `go test ./...`
  - Coverage: `go test ./... -coverprofile=/tmp/cover.out && go tool cover -func=/tmp/cover.out`
  - Lint/type: `go vet ./...` — must pass before considering work done
- **App** (from `app/`):
  - Run: `npx expo start` (press `w` for web, `i` for iOS simulator)
  - Test: `npm test`
  - Typecheck: `npx tsc --noEmit` — must pass before considering work done
  - Lint: `npx expo lint` — must pass before considering work done
- **Web frontend talks to the backend at `http://localhost:8080`** (Android emulator: `http://10.0.2.2:8080`).
  Start the backend first, then the app.

## Testing

- **All software ships with tests.** No component is done without them.
- **Coverage gate ≥ 80%** for new/changed code — measured with `go test -cover` (backend) and
  `npm test -- --coverage` (app). Never silently lowered.
- Backend logic is unit-tested against an in-memory SQLite store (`file::memory:?cache=shared`,
  `SetMaxOpenConns(1)`); handlers are tested through `httptest` with a real router.
- App logic is unit-tested with **mocked fetch** (API client) and React Native Testing Library
  (screens/components). Unit tests must never hit the network or a real device.
- Every bugfix ships with a regression test that fails on the old code and passes on the fix.

## Git workflow

- **Commit per task/unit of work**, small and frequent — never batch unrelated changes into one commit.
- **Conventional Commits** style:
  - `feat:` new feature · `fix:` bugfix · `refactor:` no behavior change · `test:` tests only ·
    `docs:` docs only · `chore:` tooling/build
  - Example: `feat(backend): add register endpoint`
- Before committing: `git status` and `git diff` — stage only intended files, never secrets.
- A commit's tests must pass before committing (`go test ./...`, `npm test` as applicable).
- Only push or open PRs when explicitly asked.
- Commit messages are in English, imperative mood, summary line under 72 chars.

## Code style

- **Go:** `gofmt` clean, `go vet` clean. Errors are wrapped with `%w`; JSON tags are
  snake_case; exported identifiers get doc comments; no unused code or imports. Follow the
  structure in `backend/internal/` (`api`, `store`, `auth` — one responsibility per file).
- **TypeScript/React Native:** strict TypeScript (no `any`), function components, hooks named
  `useX`, props typed with interfaces. Follow Prettier defaults (Expo template config).
- **SQL:** migrations are append-only and numbered (`0001_init.sql`, `0002_...`); never edit an
  already-applied migration — add a new one.
- No dead code, no commented-out code, no console spam in committed code.

## Documentation map

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — validated design specs (one per feature).
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — implementation plans (task-by-task, TDD).
- [`docs/decisions.md`](docs/decisions.md) — key technical and implementation decisions.
- [`README.md`](README.md) — how to run backend + app locally.
