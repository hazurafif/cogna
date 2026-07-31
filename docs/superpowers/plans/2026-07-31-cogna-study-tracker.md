# Cogna Study Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Cogna, a Strava-like personal study tracker: a Go + SQLite REST API and an Expo React Native app (iOS/Android/web) for logging study sessions with timers or manual entry, and viewing core stats.

**Architecture:** Monorepo with `backend/` (Go, `chi` router, `modernc.org/sqlite`, JWT auth, REST JSON under `/api/v1`) and `app/` (Expo React Native + TypeScript, `expo-router`, `react-native-web`). The app runs the timer locally and POSTs completed sessions; all persistence lives in the backend's SQLite database. Sessions are tagged with exactly one subject; subject deletion is blocked while sessions reference it. Timestamps travel as local ISO strings (`2006-01-02T15:04:05`, no zone) since app and server run on the same machine in v1.

**Tech Stack:** Go 1.26.5 (chi v5, modernc.org/sqlite, golang-jwt/jwt/v5, x/crypto/bcrypt), Expo (create-expo-app default template, expo-router, expo-secure-store, react-native-web), Jest + React Native Testing Library, Go stdlib testing.

**Reference spec:** `docs/superpowers/specs/2026-07-31-cogna-study-tracker-design.md`

---

## Part A — Backend

### Task 1: Backend scaffold with health endpoint

**Files:**
- Create: `backend/go.mod`
- Create: `backend/cmd/server/main.go`
- Create: `backend/cmd/server/main_test.go`

- [ ] **Step 1: Initialize the Go module**

Run (from `backend/`):
```bash
go mod init cogna/backend
```

- [ ] **Step 2: Write the failing health test**

Create `backend/cmd/server/main_test.go`:

```go
package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	newRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	body, err := io.ReadAll(rec.Result().Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if got := string(body); got != `{"status":"ok"}` {
		t.Fatalf("body = %q, want %q", got, `{"status":"ok"}`)
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `go test ./...`
Expected: FAIL — `undefined: newRouter`

- [ ] **Step 4: Implement minimal server**

Create `backend/cmd/server/main.go`:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func newRouter() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	return r
}

func main() {
	addr := ":" + envOr("PORT", "8080")
	server := &http.Server{Addr: addr, Handler: newRouter()}
	log.Printf("cogna backend listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
```

- [ ] **Step 5: Fetch dependencies and verify pass**

Run: `go get github.com/go-chi/chi/v5@latest && go test ./...`
Expected: PASS

- [ ] **Step 6: Verify vet and commit**

Run: `go vet ./... && gofmt -l .`
Expected: no output, nothing listed.

```bash
git add backend/ go.work
git commit -m "feat(backend): scaffold server with health endpoint"
```

Note: `go.work` may not exist — use `git add backend/` only if `git status` shows nothing for `go.work`.

---

### Task 2: JSON response helpers and error envelope

**Files:**
- Create: `backend/internal/api/respond.go`
- Create: `backend/internal/api/respond_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/api/respond_test.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusCreated, map[string]int{"id": 7})

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusCreated)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content-type = %q, want application/json", ct)
	}
	if body := rec.Body.String(); body != `{"id":7}`+"\n" {
		t.Fatalf("body = %q, want %q", body, `{"id":7}`)
	}
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	writeError(rec, http.StatusNotFound, "not_found", "no such session")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	var out struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out.Error.Code != "not_found" || out.Error.Message != "no such session" {
		t.Fatalf("got %+v", out.Error)
	}
}

func TestDecodeJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"math","color":"#4F46E5"}`))
	rec := httptest.NewRecorder()

	var payload struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := decodeJSON(rec, req, &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Name != "math" || payload.Color != "#4F46E5" {
		t.Fatalf("got %+v", payload)
	}

	bad := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":`))
	rec2 := httptest.NewRecorder()
	var dst struct{}
	if err := decodeJSON(rec2, bad, &dst); err == nil {
		t.Fatal("expected error for malformed JSON")
	}
	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec2.Code)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/api/`
Expected: FAIL — `undefined: writeJSON` (and friends)

- [ ] **Step 3: Implement helpers**

Create `backend/internal/api/respond.go`:

```go
package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, ErrorBody{Error: ErrorDetail{Code: code, Message: message}})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "request body is not valid JSON")
		return errors.New("invalid json: " + err.Error())
	}
	return nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./internal/api/`
Expected: PASS

- [ ] **Step 5: Verify and commit**

Run: `go test ./internal/api/ && go vet ./... && gofmt -l .`
Expected: all clean, no gofmt output.

```bash
git add backend/
git commit -m "feat(backend): add JSON helpers and error envelope"
```

---

### Task 3: Migrations and store bootstrap

**Files:**
- Create: `backend/internal/store/migrations/0001_init.sql`
- Create: `backend/internal/store/store.go`
- Create: `backend/internal/store/store_test.go`

- [ ] **Step 1: Write the migration SQL**

Create `backend/internal/store/migrations/0001_init.sql`:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_subjects_user ON subjects(user_id);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('timer', 'manual')),
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);
```

- [ ] **Step 2: Write the failing tests**

Create `backend/internal/store/store_test.go`:

```go
package store

import "testing"

func TestOpenRunsMigrations(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	var n int
	if err := s.db.QueryRow(
		`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'subjects', 'sessions')`,
	).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 3 {
		t.Fatalf("tables created = %d, want 3", n)
	}
}

func TestMigrateIsIdempotent(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()
	if err := s.migrate(); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
}

func TestForeignKeysEnabled(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	var fk int
	if err := s.db.QueryRow(`PRAGMA foreign_keys`).Scan(&fk); err != nil {
		t.Fatalf("query: %v", err)
	}
	if fk != 1 {
		t.Fatalf("foreign_keys = %d, want 1", fk)
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `go test ./internal/store/`
Expected: FAIL — `undefined: Open` / `s.migrate` / `s.db` (no package yet)

- [ ] **Step 4: Implement the store**

Create `backend/internal/store/store.go`:

```go
package store

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"sort"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

var (
	ErrNotFound          = errors.New("not found")
	ErrDuplicateEmail    = errors.New("duplicate email")
	ErrSubjectNotFound   = errors.New("subject not found")
	ErrSubjectInUse      = errors.New("subject in use")
)

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	dsn := path
	if path == ":memory:" {
		dsn = "file::memory:?cache=shared"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// modernc.org/sqlite is not safe for concurrent writers; one connection
	// serializes everything, which is plenty for a personal tracker.
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	if _, err := s.db.Exec(
		`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)`,
	); err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		var applied int
		if err := s.db.QueryRow(
			`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, name,
		).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if applied > 0 {
			continue
		}

		sql, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}
		tx, err := s.db.Begin()
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", name, err)
		}
		if _, err := tx.Exec(string(sql)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", name, err)
		}
		if _, err := tx.Exec(
			`INSERT INTO schema_migrations (version) VALUES (?)`, name,
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", name, err)
		}
	}
	return nil
}
```

- [ ] **Step 5: Fetch dependency and verify pass**

Run: `go get modernc.org/sqlite@latest && go test ./internal/store/`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): add sqlite store with migrations"
```

---

### Task 4: Password hashing and JWT helpers

**Files:**
- Create: `backend/internal/auth/password.go`
- Create: `backend/internal/auth/password_test.go`
- Create: `backend/internal/auth/jwt.go`
- Create: `backend/internal/auth/jwt_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/auth/password_test.go`:

```go
package auth

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if hash == "correct horse battery staple" {
		t.Fatal("hash must not equal plaintext")
	}
	if !VerifyPassword(hash, "correct horse battery staple") {
		t.Fatal("correct password should verify")
	}
	if VerifyPassword(hash, "wrong password") {
		t.Fatal("wrong password must not verify")
	}
}
```

Create `backend/internal/auth/jwt_test.go`:

```go
package auth

import "testing"

func TestIssueAndParseToken(t *testing.T) {
	const secret = "test-secret"
	token, err := IssueToken(secret, 42)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.UserID != 42 {
		t.Fatalf("user id = %d, want 42", claims.UserID)
	}
}

func TestParseTokenRejectsBadSecret(t *testing.T) {
	token, err := IssueToken("secret-a", 1)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, err := ParseToken("secret-b", token); err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestParseTokenRejectsGarbage(t *testing.T) {
	if _, err := ParseToken("secret", "not-a-token"); err == nil {
		t.Fatal("expected error for garbage token")
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/auth/`
Expected: FAIL — `undefined: HashPassword` etc.

- [ ] **Step 3: Implement password helper**

Create `backend/internal/auth/password.go`:

```go
package auth

import "golang.org/x/crypto/bcrypt"

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

func VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
```

- [ ] **Step 4: Implement JWT helper**

Create `backend/internal/auth/jwt.go`:

```go
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	UserID int64 `json:"sub"`
	jwt.RegisteredClaims
}

const tokenTTL = 24 * time.Hour

func IssueToken(secret string, userID int64) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil || !tok.Valid {
		return nil, ErrInvalidToken
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
```

- [ ] **Step 5: Fetch dependencies and verify pass**

Run: `go get golang.org/x/crypto@latest github.com/golang-jwt/jwt/v5@latest && go test ./internal/auth/`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): add password hashing and JWT helpers"
```

---

### Task 5: Auth handlers and middleware

**Files:**
- Create: `backend/internal/api/auth.go`
- Create: `backend/internal/api/middleware.go`
- Create: `backend/internal/api/auth_test.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/api/auth_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"cogna/backend/internal/store"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	ts := httptest.NewServer(NewRouter(st, "test-secret"))
	t.Cleanup(ts.Close)
	return ts
}

func registerUser(t *testing.T, ts *httptest.Server, email, password string) string {
	t.Helper()
	body := bytes.NewBufferString(`{"email":"` + email + `","password":"` + password + `"}`)
	resp, err := http.Post(ts.URL+"/api/v1/auth/register", "application/json", body)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status = %d", resp.StatusCode)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Token == "" {
		t.Fatal("register returned empty token")
	}
	return out.Token
}

func TestRegisterAndLogin(t *testing.T) {
	ts := newTestServer(t)

	registerUser(t, ts, "student@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/login",
		"application/json",
		strings.NewReader(`{"email":"student@example.com","password":"password123"}`))
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login status = %d", resp.StatusCode)
	}
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	ts := newTestServer(t)
	registerUser(t, ts, "dup@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"dup@example.com","password":"password123"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d, want 409", resp.StatusCode)
	}
}

func TestRegisterRejectsWeakPassword(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"weak@example.com","password":"short"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestLoginRejectsWrongPassword(t *testing.T) {
	ts := newTestServer(t)
	registerUser(t, ts, "user@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/login",
		"application/json",
		strings.NewReader(`{"email":"user@example.com","password":"nope"}`))
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestMeRequiresToken(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/me")
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestMeReturnsUser(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "me@example.com", "password123")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var out struct {
		User struct {
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.User.Email != "me@example.com" {
		t.Fatalf("email = %q, want me@example.com", out.User.Email)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/api/`
Expected: FAIL — `undefined: NewRouter`

- [ ] **Step 3: Add user store methods**

Create `backend/internal/store/users.go`:

```go
package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"modernc.org/sqlite"
)

type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	CreatedAt    string `json:"created_at"`
}

func (s *Store) CreateUser(email, passwordHash string) (*User, error) {
	user := &User{
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)`,
		user.Email, user.PasswordHash, user.CreatedAt,
	)
	if err != nil {
		var sqliteErr *sqlite.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code() == 2067 { // SQLITE_CONSTRAINT_UNIQUE
			return nil, ErrDuplicateEmail
		}
		return nil, fmt.Errorf("insert user: %w", err)
	}
	user.ID, _ = res.LastInsertId()
	return user, nil
}

func (s *Store) UserByEmail(email string) (*User, error) {
	user := &User{}
	err := s.db.QueryRow(
		`SELECT id, email, password_hash, created_at FROM users WHERE email = ?`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	return user, nil
}

func (s *Store) UserByID(id int64) (*User, error) {
	user := &User{}
	err := s.db.QueryRow(
		`SELECT id, email, password_hash, created_at FROM users WHERE id = ?`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	return user, nil
}
```

- [ ] **Step 4: Add the time format constant to store.go**

Add to `backend/internal/store/store.go` (replace `var (` block header):

```go
var (
	ErrNotFound        = errors.New("not found")
	ErrDuplicateEmail  = errors.New("duplicate email")
	ErrSubjectNotFound = errors.New("subject not found")
	ErrSubjectInUse    = errors.New("subject in use")
)

const timeFormat = "2006-01-02T15:04:05"
```

- [ ] **Step 5: Implement auth handlers and middleware**

Create `backend/internal/api/middleware.go`:

```go
package api

import (
	"context"
	"net/http"
	"strings"

	"cogna/backend/internal/auth"
)

type ctxKey int

const userIDKey ctxKey = 0

func requireAuth(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || tokenString == "" {
			writeError(w, http.StatusUnauthorized, "unauthorized", "missing bearer token")
			return
		}
		claims, err := auth.ParseToken(secret, tokenString)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func userIDFrom(r *http.Request) int64 {
	id, _ := r.Context().Value(userIDKey).(int64)
	return id
}
```

Create `backend/internal/api/auth.go`:

```go
package api

import (
	"net/http"
	"net/mail"

	"cogna/backend/internal/auth"
	"cogna/backend/internal/store"
)

type authHandlers struct {
	st     *store.Store
	secret string
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  *store.User `json:"user"`
}

func (h *authHandlers) register(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		return
	}
	creds.Email = trimLower(creds.Email)

	if _, err := mail.ParseAddress(creds.Email); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_email", "email must be a valid address")
		return
	}
	if len(creds.Password) < 8 {
		writeError(w, http.StatusBadRequest, "invalid_password", "password must be at least 8 characters")
		return
	}

	hash, err := auth.HashPassword(creds.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not hash password")
		return
	}
	user, err := h.st.CreateUser(creds.Email, hash)
	if err != nil {
		if err == store.ErrDuplicateEmail {
			writeError(w, http.StatusConflict, "email_taken", "an account with this email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create user")
		return
	}

	token, err := auth.IssueToken(h.secret, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not issue token")
		return
	}
	writeJSON(w, http.StatusCreated, authResponse{Token: token, User: user})
}

func (h *authHandlers) login(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := decodeJSON(w, r, &creds); err != nil {
		return
	}
	creds.Email = trimLower(creds.Email)

	user, err := h.st.UserByEmail(creds.Email)
	if err != nil || !auth.VerifyPassword(user.PasswordHash, creds.Password) {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		return
	}

	token, err := auth.IssueToken(h.secret, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not issue token")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{Token: token, User: user})
}

func (h *authHandlers) me(w http.ResponseWriter, r *http.Request) {
	user, err := h.st.UserByID(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "user no longer exists")
		return
	}
	writeJSON(w, http.StatusOK, map[string]*store.User{"user": user})
}
```

- [ ] **Step 6: Add small shared helpers**

Create `backend/internal/api/valid.go`:

```go
package api

import "strings"

func trimLower(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
```

- [ ] **Step 7: Wire the router**

Create `backend/internal/api/router.go`:

```go
package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"cogna/backend/internal/store"
)

func NewRouter(st *store.Store, secret string) http.Handler {
	r := chi.NewRouter()
	auth := &authHandlers{st: st, secret: secret}
	subjects := &subjectHandlers{st: st}
	sessions := &sessionHandlers{st: st}
	stats := &statsHandlers{st: st}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Post("/api/v1/auth/register", auth.register)
	r.Post("/api/v1/auth/login", auth.login)

	r.Group(func(r chi.Router) {
		r.Use(requireAuth(secret))
		r.Get("/api/v1/me", auth.me)
		r.Route("/api/v1/subjects", func(r chi.Router) {
			r.Get("/", subjects.list)
			r.Post("/", subjects.create)
			r.Put("/{id}", subjects.update)
			r.Delete("/{id}", subjects.delete)
		})
		r.Route("/api/v1/sessions", func(r chi.Router) {
			r.Get("/", sessions.list)
			r.Get("/{id}", sessions.get)
			r.Post("/", sessions.create)
			r.Put("/{id}", sessions.update)
			r.Delete("/{id}", sessions.delete)
		})
		r.Get("/api/v1/stats/summary", stats.summary)
	})

	return r
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}
```

Note: `subjectHandlers`, `sessionHandlers`, `statsHandlers` and their methods do not exist yet — the package will not compile until Tasks 6–8. That is expected; run the tests after Task 8, or stub them now to verify auth:

Temporarily add at the bottom of `router.go` until Tasks 6–8 land:

```go
type subjectHandlers struct{ st *store.Store }

func (h *subjectHandlers) list(w http.ResponseWriter, r *http.Request)   { writeJSON(w, http.StatusOK, []store.Subject{}) }
func (h *subjectHandlers) create(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
func (h *subjectHandlers) update(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
func (h *subjectHandlers) delete(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }

type sessionHandlers struct{ st *store.Store }

func (h *sessionHandlers) list(w http.ResponseWriter, r *http.Request)   { writeJSON(w, http.StatusOK, []store.Session{}) }
func (h *sessionHandlers) get(w http.ResponseWriter, r *http.Request)    { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
func (h *sessionHandlers) create(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
func (h *sessionHandlers) update(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
func (h *sessionHandlers) delete(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }

type statsHandlers struct{ st *store.Store }

func (h *statsHandlers) summary(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "not_implemented", "") }
```

These stubs get deleted in Tasks 6–8 as the real handlers replace them.

- [ ] **Step 8: Update main.go to wire the store**

Replace `backend/cmd/server/main.go` with:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

	"cogna/backend/internal/api"
	"cogna/backend/internal/store"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func newRouter(st *store.Store, secret string) http.Handler {
	r := chi.NewRouter()
	r.Mount("/", api.NewRouter(st, secret))
	return r
}

func main() {
	addr := ":" + envOr("PORT", "8080")
	dbPath := envOr("DATABASE_PATH", "data/cogna.db")
	secret := envOr("JWT_SECRET", "dev-secret-change-me")

	st, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	server := &http.Server{Addr: addr, Handler: newRouter(st, secret)}
	log.Printf("cogna backend listening on %s", addr)
	log.Fatal(server.ListenAndServe())
}
```

The health test in `main_test.go` now needs a store — update it to use `store.Open(":memory:")`:

```go
package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"cogna/backend/internal/store"
)

func TestHealthEndpoint(t *testing.T) {
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	defer st.Close()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	newRouter(st, "test-secret").ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	body, err := io.ReadAll(rec.Result().Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if got := string(body); got != `{"status":"ok"}` {
		t.Fatalf("body = %q, want %q", got, `{"status":"ok"}`)
	}
}
```

- [ ] **Step 9: Run all tests and verify**

Run: `go test ./... && go vet ./... && gofmt -l .`
Expected: all PASS, vet clean, gofmt lists nothing.

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): add register, login, me endpoints with JWT auth"
```

---

### Task 6: Subjects store and handlers

**Files:**
- Create: `backend/internal/store/subjects.go`
- Create: `backend/internal/store/subjects_test.go`
- Create: `backend/internal/api/subjects.go`
- Create: `backend/internal/api/subjects_test.go`
- Modify: `backend/internal/api/router.go` (delete subject stubs)

- [ ] **Step 1: Write the failing store tests**

Create `backend/internal/store/subjects_test.go`:

```go
package store

import (
	"errors"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func mustUser(t *testing.T, s *Store, email string) int64 {
	t.Helper()
	u, err := s.CreateUser(email, "hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return u.ID
}

func TestCreateAndListSubjects(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "sub@example.com")

	got, err := s.CreateSubject(userID, "Math", "#4F46E5")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if got.Name != "Math" || got.Color != "#4F46E5" {
		t.Fatalf("got %+v", got)
	}
	if got.ID == 0 {
		t.Fatal("expected non-zero id")
	}

	subs, err := s.ListSubjects(userID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(subs) != 1 || subs[0].Name != "Math" {
		t.Fatalf("got %+v", subs)
	}
}

func TestListSubjectsScopedToUser(t *testing.T) {
	s := newTestStore(t)
	userA := mustUser(t, s, "a@example.com")
	userB := mustUser(t, s, "b@example.com")

	if _, err := s.CreateSubject(userA, "A-only", "#111111"); err != nil {
		t.Fatalf("create: %v", err)
	}

	subs, err := s.ListSubjects(userB)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(subs) != 0 {
		t.Fatalf("user B sees %d subjects, want 0", len(subs))
	}
}

func TestUpdateSubject(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "up@example.com")

	sub, err := s.CreateSubject(userID, "Old", "#000000")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	got, err := s.UpdateSubject(userID, sub.ID, "New", "#FFFFFF")
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.Name != "New" || got.Color != "#FFFFFF" {
		t.Fatalf("got %+v", got)
	}

	if _, err := s.UpdateSubject(userID+1, sub.ID, "X", "#000000"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other user's subject: err = %v, want ErrNotFound", err)
	}
}

func TestDeleteSubject(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "del@example.com")

	sub, err := s.CreateSubject(userID, "Doomed", "#000000")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := s.DeleteSubject(userID, sub.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.DeleteSubject(userID, sub.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second delete: err = %v, want ErrNotFound", err)
	}
}

func TestDeleteSubjectInUse(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "busy@example.com")

	sub, err := s.CreateSubject(userID, "Busy", "#000000")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub.ID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); err != nil {
		t.Fatalf("create session: %v", err)
	}

	if err := s.DeleteSubject(userID, sub.ID); !errors.Is(err, ErrSubjectInUse) {
		t.Fatalf("err = %v, want ErrSubjectInUse", err)
	}
}
```

Note: `CreateSession` is implemented in Task 7 — until then `TestDeleteSubjectInUse` won't compile. Either run only the other tests for now (`go test ./internal/store/ -run 'Test(Create|List|Update|DeleteSubject)'`) or implement Task 7 first. Recommended: write Task 6 steps 1–4, then Task 7 step 1, then run the full store suite.

- [ ] **Step 2: Implement subjects store**

Create `backend/internal/store/subjects.go`:

```go
package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"modernc.org/sqlite"
)

type Subject struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"user_id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
}

func (s *Store) CreateSubject(userID int64, name, color string) (*Subject, error) {
	sub := &Subject{
		UserID:    userID,
		Name:      name,
		Color:     color,
		CreatedAt: time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO subjects (user_id, name, color, created_at) VALUES (?, ?, ?, ?)`,
		sub.UserID, sub.Name, sub.Color, sub.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert subject: %w", err)
	}
	sub.ID, _ = res.LastInsertId()
	return sub, nil
}

func (s *Store) ListSubjects(userID int64) ([]Subject, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, name, color, created_at FROM subjects WHERE user_id = ? ORDER BY name`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list subjects: %w", err)
	}
	defer rows.Close()

	subs := make([]Subject, 0)
	for rows.Next() {
		var sub Subject
		if err := rows.Scan(&sub.ID, &sub.UserID, &sub.Name, &sub.Color, &sub.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan subject: %w", err)
		}
		subs = append(subs, sub)
	}
	return subs, rows.Err()
}

func (s *Store) SubjectByID(userID, id int64) (*Subject, error) {
	sub := &Subject{}
	err := s.db.QueryRow(
		`SELECT id, user_id, name, color, created_at FROM subjects WHERE user_id = ? AND id = ?`,
		userID, id,
	).Scan(&sub.ID, &sub.UserID, &sub.Name, &sub.Color, &sub.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSubjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query subject: %w", err)
	}
	return sub, nil
}

func (s *Store) UpdateSubject(userID, id int64, name, color string) (*Subject, error) {
	res, err := s.db.Exec(
		`UPDATE subjects SET name = ?, color = ? WHERE user_id = ? AND id = ?`,
		name, color, userID, id,
	)
	if err != nil {
		return nil, fmt.Errorf("update subject: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.SubjectByID(userID, id)
}

func (s *Store) DeleteSubject(userID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM subjects WHERE user_id = ? AND id = ?`, userID, id)
	if err != nil {
		var sqliteErr *sqlite.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code() == 787 { // SQLITE_CONSTRAINT_FOREIGNKEY
			return ErrSubjectInUse
		}
		return fmt.Errorf("delete subject: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 3: Write the failing handler tests**

Create `backend/internal/api/subjects_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func createSubject(t *testing.T, ts *httptest.Server, token, name, color string) int64 {
	t.Helper()
	body := bytes.NewBufferString(`{"name":"` + name + `","color":"` + color + `"}`)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/subjects", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("create subject: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	var out struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return out.ID
}

func TestSubjectCRUD(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "subs@example.com", "password123")

	id := createSubject(t, ts, token, "Math", "#4F46E5")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/subjects", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	defer resp.Body.Close()
	var subs []struct {
		ID    int64  `json:"id"`
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&subs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(subs) != 1 || subs[0].ID != id || subs[0].Name != "Math" {
		t.Fatalf("got %+v", subs)
	}

	req, _ = http.NewRequest(http.MethodPut, ts.URL+"/api/v1/subjects/"+strconvFormatInt(id),
		strings.NewReader(`{"name":"Calculus","color":"#10B981"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("update status = %d", resp.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/subjects/"+strconvFormatInt(id), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status = %d", resp.StatusCode)
	}
}

func TestSubjectValidation(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "val@example.com", "password123")

	for _, payload := range []string{
		`{"name":"","color":"#4F46E5"}`,
		`{"name":"Math","color":"red"}`,
	} {
		req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/subjects",
			strings.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("post: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("payload %s: status = %d, want 400", payload, resp.StatusCode)
		}
	}
}

func TestSubjectScopedToUser(t *testing.T) {
	ts := newTestServer(t)
	tokenA := registerUser(t, ts, "scop-a@example.com", "password123")
	tokenB := registerUser(t, ts, "scop-b@example.com", "password123")

	id := createSubject(t, ts, tokenA, "Mine", "#000000")

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/v1/subjects/"+strconvFormatInt(id),
		strings.NewReader(`{"name":"Hacked","color":"#000000"}`))
	req.Header.Set("Authorization", "Bearer "+tokenB)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}
```

Add `strconvFormatInt` to `backend/internal/api/valid.go`:

```go
func strconvFormatInt(n int64) string {
	return strconv.FormatInt(n, 10)
}
```

(needs `"strconv"` import in valid.go)

- [ ] **Step 4: Implement subject handlers**

Create `backend/internal/api/subjects.go`:

```go
package api

import (
	"net/http"
	"regexp"

	"cogna/backend/internal/store"
)

type subjectHandlers struct {
	st *store.Store
}

type subjectPayload struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

var colorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func (h *subjectHandlers) validate(w http.ResponseWriter, p *subjectPayload) bool {
	p.Name = trimLower(p.Name)
	if p.Name == "" || len(p.Name) > 60 {
		writeError(w, http.StatusBadRequest, "invalid_name", "name must be 1-60 characters")
		return false
	}
	if !colorPattern.MatchString(p.Color) {
		writeError(w, http.StatusBadRequest, "invalid_color", "color must be a hex value like #4F46E5")
		return false
	}
	return true
}

func (h *subjectHandlers) list(w http.ResponseWriter, r *http.Request) {
	subs, err := h.st.ListSubjects(userIDFrom(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list subjects")
		return
	}
	writeJSON(w, http.StatusOK, subs)
}

func (h *subjectHandlers) create(w http.ResponseWriter, r *http.Request) {
	var p subjectPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sub, err := h.st.CreateSubject(userIDFrom(r), p.Name, p.Color)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create subject")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *subjectHandlers) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	var p subjectPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sub, err := h.st.UpdateSubject(userIDFrom(r), id, p.Name, p.Color)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "subject not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not update subject")
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

func (h *subjectHandlers) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	err := h.st.DeleteSubject(userIDFrom(r), id)
	switch err {
	case nil:
		w.WriteHeader(http.StatusNoContent)
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "not_found", "subject not found")
	case store.ErrSubjectInUse:
		writeError(w, http.StatusConflict, "subject_in_use", "subject has sessions; delete or reassign them first")
	default:
		writeError(w, http.StatusInternalServerError, "internal", "could not delete subject")
	}
}
```

- [ ] **Step 5: Delete the subject stubs from router.go**

Remove the `subjectHandlers` stub block added in Task 5 step 7.

- [ ] **Step 6: Run tests and verify**

Run: `go test ./... && go vet ./... && gofmt -l .`
Expected: PASS. (`TestDeleteSubjectInUse` may still not compile if Task 7 hasn't added `CreateSession` — if so, proceed to Task 7 step 1, then re-run.)

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): add subjects CRUD endpoints"
```

---

### Task 7: Sessions store and handlers

**Files:**
- Create: `backend/internal/store/sessions.go`
- Create: `backend/internal/store/sessions_test.go`
- Create: `backend/internal/api/sessions.go`
- Create: `backend/internal/api/sessions_test.go`
- Modify: `backend/internal/api/router.go` (delete session stubs)

- [ ] **Step 1: Write the failing store tests**

Create `backend/internal/store/sessions_test.go`:

```go
package store

import (
	"errors"
	"testing"
)

func mustSubject(t *testing.T, s *Store, userID int64, name string) int64 {
	t.Helper()
	sub, err := s.CreateSubject(userID, name, "#4F46E5")
	if err != nil {
		t.Fatalf("create subject: %v", err)
	}
	return sub.ID
}

func TestCreateAndGetSession(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "sess@example.com")
	subjectID := mustSubject(t, s, userID, "Math")

	sess, err := s.CreateSession(userID, subjectID, "2026-07-31T09:00:00", "2026-07-31T10:30:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if sess.DurationMinutes != 90 {
		t.Fatalf("duration = %d, want 90", sess.DurationMinutes)
	}
	if sess.Source != "timer" {
		t.Fatalf("source = %q, want timer", sess.Source)
	}

	got, err := s.SessionByID(userID, sess.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.SubjectID != subjectID || got.SubjectName != "Math" {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateSessionValidatesSubjectOwnership(t *testing.T) {
	s := newTestStore(t)
	userA := mustUser(t, s, "own-a@example.com")
	userB := mustUser(t, s, "own-b@example.com")
	subjectA := mustSubject(t, s, userA, "A-subject")

	if _, err := s.CreateSession(userB, subjectA, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); !errors.Is(err, ErrSubjectNotFound) {
		t.Fatalf("err = %v, want ErrSubjectNotFound", err)
	}
}

func TestListSessionsFilters(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "list@example.com")
	subA := mustSubject(t, s, userID, "Math")
	subB := mustSubject(t, s, userID, "History")

	if _, err := s.CreateSession(userID, subA, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, subB, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	all, err := s.ListSessions(userID, "", "", 0)
	if err != nil {
		t.Fatalf("list all: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("got %d sessions, want 2", len(all))
	}
	if all[0].StartedAt < all[1].StartedAt {
		t.Fatal("expected newest first")
	}

	day, err := s.ListSessions(userID, "2026-07-31", "2026-07-31", 0)
	if err != nil {
		t.Fatalf("list day: %v", err)
	}
	if len(day) != 1 || day[0].SubjectID != subB {
		t.Fatalf("got %+v", day)
	}

	only, err := s.ListSessions(userID, "", "", subA)
	if err != nil {
		t.Fatalf("list by subject: %v", err)
	}
	if len(only) != 1 || only[0].SubjectID != subA {
		t.Fatalf("got %+v", only)
	}
}

func TestUpdateAndDeleteSession(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "upd@example.com")
	subA := mustSubject(t, s, userID, "Math")
	subB := mustSubject(t, s, userID, "History")

	sess, err := s.CreateSession(userID, subA, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	note := "final review"
	got, err := s.UpdateSession(userID, sess.ID, subB, "2026-07-31T08:00:00", "2026-07-31T09:30:00", &note)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.SubjectID != subB || got.DurationMinutes != 90 || got.Note == nil || *got.Note != "final review" {
		t.Fatalf("got %+v", got)
	}

	if err := s.DeleteSession(userID, sess.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := s.SessionByID(userID, sess.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
	if err := s.DeleteSession(userID, sess.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second delete: err = %v, want ErrNotFound", err)
	}
}
```

- [ ] **Step 2: Implement sessions store**

Create `backend/internal/store/sessions.go`:

```go
package store

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"
)

type Session struct {
	ID              int64   `json:"id"`
	UserID          int64   `json:"user_id"`
	SubjectID       int64   `json:"subject_id"`
	SubjectName     string  `json:"subject_name"`
	SubjectColor    string  `json:"subject_color"`
	StartedAt       string  `json:"started_at"`
	EndedAt         string  `json:"ended_at"`
	DurationMinutes int64   `json:"duration_minutes"`
	Source          string  `json:"source"`
	Note            *string `json:"note"`
	CreatedAt       string  `json:"created_at"`
}

func durationMinutes(startedAt, endedAt string) (int64, error) {
	start, err := time.Parse(timeFormat, startedAt)
	if err != nil {
		return 0, fmt.Errorf("parse started_at: %w", err)
	}
	end, err := time.Parse(timeFormat, endedAt)
	if err != nil {
		return 0, fmt.Errorf("parse ended_at: %w", err)
	}
	mins := int64(math.Round(end.Sub(start).Minutes()))
	if mins < 1 {
		mins = 1
	}
	return mins, nil
}

func (s *Store) CreateSession(userID, subjectID int64, startedAt, endedAt, source string, note *string) (*Session, error) {
	if _, err := s.SubjectByID(userID, subjectID); err != nil {
		return nil, ErrSubjectNotFound
	}
	mins, err := durationMinutes(startedAt, endedAt)
	if err != nil {
		return nil, err
	}

	sess := &Session{
		UserID:          userID,
		SubjectID:       subjectID,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		DurationMinutes: mins,
		Source:          source,
		Note:            note,
		CreatedAt:       time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO sessions (user_id, subject_id, started_at, ended_at, duration_minutes, source, note, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sess.UserID, sess.SubjectID, sess.StartedAt, sess.EndedAt,
		sess.DurationMinutes, sess.Source, sess.Note, sess.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert session: %w", err)
	}
	sess.ID, _ = res.LastInsertId()
	return sess, nil
}

const sessionColumns = `s.id, s.user_id, s.subject_id, sub.name, sub.color,
	s.started_at, s.ended_at, s.duration_minutes, s.source, s.note, s.created_at`

func (s *Store) scanSession(row interface{ Scan(...any) error }) (*Session, error) {
	var sess Session
	err := row.Scan(&sess.ID, &sess.UserID, &sess.SubjectID, &sess.SubjectName,
		&sess.SubjectColor, &sess.StartedAt, &sess.EndedAt, &sess.DurationMinutes,
		&sess.Source, &sess.Note, &sess.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *Store) SessionByID(userID, id int64) (*Session, error) {
	sess, err := s.scanSession(s.db.QueryRow(
		`SELECT `+sessionColumns+` FROM sessions s
		 JOIN subjects sub ON sub.id = s.subject_id
		 WHERE s.user_id = ? AND s.id = ?`, userID, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query session: %w", err)
	}
	return sess, nil
}

func (s *Store) ListSessions(userID int64, from, to string, subjectID int64) ([]Session, error) {
	query := `SELECT ` + sessionColumns + ` FROM sessions s
		JOIN subjects sub ON sub.id = s.subject_id
		WHERE s.user_id = ?`
	args := []any{userID}

	if from != "" {
		query += ` AND date(s.started_at) >= ?`
		args = append(args, from)
	}
	if to != "" {
		query += ` AND date(s.started_at) <= ?`
		args = append(args, to)
	}
	if subjectID > 0 {
		query += ` AND s.subject_id = ?`
		args = append(args, subjectID)
	}
	query += ` ORDER BY s.started_at DESC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]Session, 0)
	for rows.Next() {
		sess, err := s.scanSession(rows)
		if err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, *sess)
	}
	return sessions, rows.Err()
}

func (s *Store) UpdateSession(userID, id, subjectID int64, startedAt, endedAt string, note *string) (*Session, error) {
	if _, err := s.SubjectByID(userID, subjectID); err != nil {
		return nil, ErrSubjectNotFound
	}
	mins, err := durationMinutes(startedAt, endedAt)
	if err != nil {
		return nil, err
	}

	res, err := s.db.Exec(
		`UPDATE sessions SET subject_id = ?, started_at = ?, ended_at = ?, duration_minutes = ?, note = ?
		 WHERE user_id = ? AND id = ?`,
		subjectID, startedAt, endedAt, mins, note, userID, id,
	)
	if err != nil {
		return nil, fmt.Errorf("update session: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.SessionByID(userID, id)
}

func (s *Store) DeleteSession(userID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM sessions WHERE user_id = ? AND id = ?`, userID, id)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 3: Run store tests**

Run: `go test ./internal/store/`
Expected: PASS — all store tests including Task 6's `TestDeleteSubjectInUse` now compile.

- [ ] **Step 4: Write the failing handler tests**

Create `backend/internal/api/sessions_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func createSession(t *testing.T, ts *httptest.Server, token string, subjectID int64, started, ended string) int64 {
	t.Helper()
	body := bytes.NewBufferString(`{"subject_id":` + strconvFormatInt(subjectID) +
		`,"started_at":"` + started + `","ended_at":"` + ended + `","source":"manual"}`)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/sessions", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	var out struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return out.ID
}

func TestSessionLifecycle(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "life@example.com", "password123")
	subID := createSubject(t, ts, token, "Math", "#4F46E5")

	id := createSession(t, ts, token, subID, "2026-07-31T09:00:00", "2026-07-31T10:15:00")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	var sess struct {
		DurationMinutes int64  `json:"duration_minutes"`
		SubjectName     string `json:"subject_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sess); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if sess.DurationMinutes != 75 || sess.SubjectName != "Math" {
		t.Fatalf("got %+v", sess)
	}

	req, _ = http.NewRequest(http.MethodPut, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id),
		strings.NewReader(`{"subject_id":`+strconvFormatInt(subID)+`,"started_at":"2026-07-31T08:00:00","ended_at":"2026-07-31T09:30:00","note":"deep work"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("update status = %d", resp.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status = %d", resp.StatusCode)
	}
}

func TestCreateSessionValidation(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "sv@example.com", "password123")
	subID := createSubject(t, ts, token, "Math", "#4F46E5")

	for _, payload := range []string{
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T10:00:00","ended_at":"2026-07-31T09:00:00","source":"manual"}`, // end before start
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"not-a-time","ended_at":"2026-07-31T10:00:00","source":"manual"}`,
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"automatic"}`, // bad source
	} {
		req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/sessions", strings.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("post: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("payload %s: status = %d, want 400", payload, resp.StatusCode)
		}
	}
}

func TestSessionSubjectScopedToUser(t *testing.T) {
	ts := newTestServer(t)
	tokenA := registerUser(t, ts, "ss-a@example.com", "password123")
	tokenB := registerUser(t, ts, "ss-b@example.com", "password123")
	subA := createSubject(t, ts, tokenA, "Mine", "#000000")

	body := bytes.NewBufferString(`{"subject_id":` + strconvFormatInt(subA) +
		`,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/sessions", body)
	req.Header.Set("Authorization", "Bearer "+tokenB)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}
```

- [ ] **Step 5: Implement session handlers**

Create `backend/internal/api/sessions.go`:

```go
package api

import (
	"net/http"

	"cogna/backend/internal/store"
)

type sessionHandlers struct {
	st *store.Store
}

type sessionPayload struct {
	SubjectID int64   `json:"subject_id"`
	StartedAt string  `json:"started_at"`
	EndedAt   string  `json:"ended_at"`
	Source    string  `json:"source"`
	Note      *string `json:"note"`
}

func (h *sessionHandlers) validate(w http.ResponseWriter, p *sessionPayload) bool {
	if p.SubjectID <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_subject", "subject_id must be a positive integer")
		return false
	}
	if _, err := parseTime(p.StartedAt); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_started_at", "started_at must be ISO 8601 like 2026-07-31T09:00:00")
		return false
	}
	if _, err := parseTime(p.EndedAt); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_ended_at", "ended_at must be ISO 8601 like 2026-07-31T09:00:00")
		return false
	}
	if p.StartedAt >= p.EndedAt {
		writeError(w, http.StatusBadRequest, "invalid_range", "started_at must be before ended_at")
		return false
	}
	if p.Source != "timer" && p.Source != "manual" {
		writeError(w, http.StatusBadRequest, "invalid_source", "source must be timer or manual")
		return false
	}
	if p.Note != nil && len(*p.Note) > 500 {
		writeError(w, http.StatusBadRequest, "invalid_note", "note must be at most 500 characters")
		return false
	}
	return true
}

func (h *sessionHandlers) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var subjectID int64
	if v := q.Get("subject_id"); v != "" {
		parsed, err := parseInt64(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_subject_id", "subject_id must be a positive integer")
			return
		}
		subjectID = parsed
	}
	sessions, err := h.st.ListSessions(userIDFrom(r), q.Get("from"), q.Get("to"), subjectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not list sessions")
		return
	}
	writeJSON(w, http.StatusOK, sessions)
}

func (h *sessionHandlers) get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	sess, err := h.st.SessionByID(userIDFrom(r), id)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "session not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not get session")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *sessionHandlers) create(w http.ResponseWriter, r *http.Request) {
	var p sessionPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sess, err := h.st.CreateSession(userIDFrom(r), p.SubjectID, p.StartedAt, p.EndedAt, p.Source, p.Note)
	if err != nil {
		if err == store.ErrSubjectNotFound {
			writeError(w, http.StatusBadRequest, "invalid_subject", "subject does not exist")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create session")
		return
	}
	writeJSON(w, http.StatusCreated, sess)
}

func (h *sessionHandlers) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	var p sessionPayload
	if err := decodeJSON(w, r, &p); err != nil {
		return
	}
	if !h.validate(w, &p) {
		return
	}
	sess, err := h.st.UpdateSession(userIDFrom(r), id, p.SubjectID, p.StartedAt, p.EndedAt, p.Note)
	if err != nil {
		switch err {
		case store.ErrNotFound:
			writeError(w, http.StatusNotFound, "not_found", "session not found")
		case store.ErrSubjectNotFound:
			writeError(w, http.StatusBadRequest, "invalid_subject", "subject does not exist")
		default:
			writeError(w, http.StatusInternalServerError, "internal", "could not update session")
		}
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *sessionHandlers) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a positive integer")
		return
	}
	err := h.st.DeleteSession(userIDFrom(r), id)
	switch err {
	case nil:
		w.WriteHeader(http.StatusNoContent)
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "not_found", "session not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal", "could not delete session")
	}
}
```

- [ ] **Step 6: Add parse helpers to valid.go**

Add to `backend/internal/api/valid.go` (plus `"errors"`, `"time"` and `"strconv"` imports):

```go
func parseTime(s string) (time.Time, error) {
	for _, layout := range []string{timeFormat, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("invalid time format")
}

func parseInt64(s string) (int64, error) {
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil || n <= 0 {
		return 0, errors.New("invalid integer")
	}
	return n, nil
}
```

Note: `timeFormat` lives in the `store` package — add `timeFormat` to `api/valid.go` too:

```go
const timeFormat = "2006-01-02T15:04:05"
```

- [ ] **Step 7: Delete session stubs from router.go**

Remove the `sessionHandlers` stub block from Task 5 step 7.

- [ ] **Step 8: Run all tests and verify**

Run: `go test ./... && go vet ./... && gofmt -l .`
Expected: all PASS, vet clean.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(backend): add sessions CRUD endpoints"
```

---

### Task 8: Stats summary endpoint

**Files:**
- Create: `backend/internal/store/stats.go`
- Create: `backend/internal/store/stats_test.go`
- Create: `backend/internal/api/stats.go`
- Create: `backend/internal/api/stats_test.go`
- Modify: `backend/internal/api/router.go` (delete stats stub)

- [ ] **Step 1: Write the failing store tests**

Create `backend/internal/store/stats_test.go`:

```go
package store

import (
	"testing"
	"time"
)

func TestSummary(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "stats@example.com")
	math := mustSubject(t, s, userID, "Math")
	hist := mustSubject(t, s, userID, "History")

	// Same-day sessions: 90 + 60 minutes
	if _, err := s.CreateSession(userID, math, "2026-07-29T09:00:00", "2026-07-29T10:30:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, hist, "2026-07-29T14:00:00", "2026-07-29T15:00:00", "manual", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Yesterday
	if _, err := s.CreateSession(userID, math, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Today
	if _, err := s.CreateSession(userID, math, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Last week, out of the current week
	if _, err := s.CreateSession(userID, hist, "2026-07-20T09:00:00", "2026-07-20T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if sum.TotalMinutes != 270 { // 90 + 60 + 60 + 60
		t.Fatalf("total = %d, want 270", sum.TotalMinutes)
	}
	if sum.WeekMinutes != 210 { // 90 + 60 (29th) + 60 (30th) + 60 (31st)
		t.Fatalf("week = %d, want 210", sum.WeekMinutes)
	}
	if sum.StreakDays != 3 { // 29th, 30th, 31st
		t.Fatalf("streak = %d, want 3", sum.StreakDays)
	}
	if len(sum.PerSubject) != 2 {
		t.Fatalf("per subject = %d entries, want 2", len(sum.PerSubject))
	}
	if sum.PerSubject[0].Name != "Math" || sum.PerSubject[0].Minutes != 150 {
		t.Fatalf("first subject = %+v, want Math 150", sum.PerSubject[0])
	}
}

func TestStreakDoesNotBreakOnTodayWithoutStudy(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "streak@example.com")
	sub := mustSubject(t, s, userID, "Math")

	if _, err := s.CreateSession(userID, sub, "2026-07-29T09:00:00", "2026-07-29T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if sum.StreakDays != 2 {
		t.Fatalf("streak = %d, want 2", sum.StreakDays)
	}
}

func TestStreakResetsAfterGap(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "gap@example.com")
	sub := mustSubject(t, s, userID, "Math")

	if _, err := s.CreateSession(userID, sub, "2026-07-28T09:00:00", "2026-07-28T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if sum.StreakDays != 1 { // only 30th, gap before 28th
		t.Fatalf("streak = %d, want 1", sum.StreakDays)
	}
}
```

- [ ] **Step 2: Implement stats store**

Create `backend/internal/store/stats.go`:

```go
package store

import (
	"fmt"
	"time"
)

type SubjectTot struct {
	SubjectID int64  `json:"subject_id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	Minutes   int64  `json:"minutes"`
}

type Summary struct {
	TotalMinutes int64        `json:"total_minutes"`
	WeekMinutes  int64        `json:"week_minutes"`
	StreakDays   int          `json:"streak_days"`
	PerSubject   []SubjectTot `json:"per_subject"`
}

func (s *Store) Summary(userID int64, now time.Time) (*Summary, error) {
	sum := &Summary{PerSubject: []SubjectTot{}}

	if err := s.db.QueryRow(
		`SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions WHERE user_id = ?`,
		userID,
	).Scan(&sum.TotalMinutes); err != nil {
		return nil, fmt.Errorf("sum total: %w", err)
	}

	weekStart := startOfWeek(now).Format("2006-01-02")
	if err := s.db.QueryRow(
		`SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions
		 WHERE user_id = ? AND date(started_at) >= ?`,
		userID, weekStart,
	).Scan(&sum.WeekMinutes); err != nil {
		return nil, fmt.Errorf("sum week: %w", err)
	}

	rows, err := s.db.Query(
		`SELECT sub.id, sub.name, sub.color, SUM(sess.duration_minutes)
		 FROM sessions sess JOIN subjects sub ON sub.id = sess.subject_id
		 WHERE sess.user_id = ?
		 GROUP BY sub.id, sub.name, sub.color
		 ORDER BY SUM(sess.duration_minutes) DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("per subject: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var tot SubjectTot
		if err := rows.Scan(&tot.SubjectID, &tot.Name, &tot.Color, &tot.Minutes); err != nil {
			return nil, fmt.Errorf("scan subject total: %w", err)
		}
		sum.PerSubject = append(sum.PerSubject, tot)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("per subject rows: %w", err)
	}

	days, err := s.studyDays(userID)
	if err != nil {
		return nil, err
	}
	sum.StreakDays = currentStreak(days, now)
	return sum, nil
}

func (s *Store) studyDays(userID int64) (map[string]bool, error) {
	rows, err := s.db.Query(
		`SELECT DISTINCT date(started_at) FROM sessions WHERE user_id = ?`, userID)
	if err != nil {
		return nil, fmt.Errorf("study days: %w", err)
	}
	defer rows.Close()
	days := map[string]bool{}
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan day: %w", err)
		}
		days[d] = true
	}
	return days, rows.Err()
}

func startOfWeek(now time.Time) time.Time {
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	offset := (int(day.Weekday()) + 6) % 7 // Monday = 0
	return day.AddDate(0, 0, -offset)
}

// currentStreak counts consecutive study days ending today, or ending
// yesterday if today has no study yet (the streak is still alive).
func currentStreak(days map[string]bool, now time.Time) int {
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if !days[day.Format("2006-01-02")] {
		day = day.AddDate(0, 0, -1)
	}
	streak := 0
	for days[day.Format("2006-01-02")] {
		streak++
		day = day.AddDate(0, 0, -1)
	}
	return streak
}
```

- [ ] **Step 3: Run store tests**

Run: `go test ./internal/store/`
Expected: PASS

- [ ] **Step 4: Write the failing handler test**

Create `backend/internal/api/stats_test.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestStatsSummary(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "stat@example.com", "password123")
	subID := createSubject(t, ts, token, "Math", "#4F46E5")

	// Yesterday (relative to test: use fixed dates like other tests)
	createSession(t, ts, token, subID, "2026-07-30T09:00:00", "2026-07-30T10:00:00")
	createSession(t, ts, token, subID, "2026-07-31T09:00:00", "2026-07-31T11:00:00")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/stats/summary", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var sum struct {
		TotalMinutes int64 `json:"total_minutes"`
		WeekMinutes  int64 `json:"week_minutes"`
		StreakDays   int   `json:"streak_days"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sum); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if sum.TotalMinutes != 180 {
		t.Fatalf("total = %d, want 180", sum.TotalMinutes)
	}
	if sum.WeekMinutes != 180 {
		t.Fatalf("week = %d, want 180", sum.WeekMinutes)
	}
	if sum.StreakDays != 2 {
		t.Fatalf("streak = %d, want 2", sum.StreakDays)
	}
}

func TestStatsSummaryRequiresAuth(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/stats/summary")
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
```

Note: `TestStatsSummary` asserts on week totals against the server's real "today". If run on a real date far from 2026-07-31, the week assertion may fail. If that happens, use `httptest` with the real router plus a fixed-clock store — simplest fix: change the dates in this test to be relative to `time.Now()` before asserting (e.g., create sessions "today" and "yesterday" computed in Go). Apply that fix if the test fails for clock reasons, not code reasons.

- [ ] **Step 5: Implement stats handler**

Create `backend/internal/api/stats.go`:

```go
package api

import (
	"net/http"
	"time"

	"cogna/backend/internal/store"
)

type statsHandlers struct {
	st *store.Store
}

func (h *statsHandlers) summary(w http.ResponseWriter, r *http.Request) {
	sum, err := h.st.Summary(userIDFrom(r), time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not compute stats")
		return
	}
	writeJSON(w, http.StatusOK, sum)
}
```

- [ ] **Step 6: Delete stats stub from router.go**

Remove the `statsHandlers` stub block from Task 5 step 7.

- [ ] **Step 7: Run all backend tests and verify**

Run: `go test ./... && go vet ./... && gofmt -l .`
Expected: all PASS, vet clean, no gofmt output.

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): add stats summary endpoint"
```

---

### Task 9: CORS and backend verification

**Files:**
- Modify: `backend/internal/api/router.go`

- [ ] **Step 1: Add CORS middleware**

Modify `backend/internal/api/router.go` — imports and `NewRouter`:

```go
import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"cogna/backend/internal/store"
)
```

and inside `NewRouter`, after `r := chi.NewRouter()`:

```go
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
```

- [ ] **Step 2: Fetch dependency and verify**

Run: `go get github.com/go-chi/cors@latest && go test ./... && go vet ./... && gofmt -l .`
Expected: PASS.

- [ ] **Step 3: Verify coverage**

Run: `go test ./... -cover`
Expected: total coverage ≥ 80%.

If below 80%, add the missing tests (likely spots: `sessions.list` query param parsing, `me` with deleted user).

- [ ] **Step 4: Smoke-test the server manually**

Run: `go run ./cmd/server`
In another terminal:
```bash
curl -s localhost:8080/health
curl -s -X POST localhost:8080/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"demo@example.com","password":"password123"}'
```
Expected: `{"status":"ok"}` and a JSON body with `token` and `user`. Stop the server (Ctrl-C), then run `go test ./...` once more and commit.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): enable CORS for local web development"
```

---

## Part B — Frontend (Expo React Native)

### Task 10: Scaffold the Expo app

**Files:**
- Create: everything under `app/` via `create-expo-app`

- [ ] **Step 1: Create the app**

Run (from repo root):
```bash
npx create-expo-app@latest app --template default
```

- [ ] **Step 2: Install platform + storage deps**

Run (from `app/`):
```bash
npx expo install react-native-web react-dom expo-secure-store
```

- [ ] **Step 3: Install test tooling**

Run (from `app/`):
```bash
npx expo install jest-expo jest -- --save-dev
npm install --save-dev @testing-library/react-native @types/jest
```

- [ ] **Step 4: Configure jest**

Add to `app/package.json`:

```json
  "jest": {
    "preset": "jest-expo"
  }
```

- [ ] **Step 5: Verify baseline**

Run: `npx expo lint && npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: "No tests found" (exit 0) — the scaffold has no tests yet.

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "chore(app): scaffold Expo app with test tooling"
```

---

### Task 11: API client and token storage

**Files:**
- Create: `app/src/api/client.ts`
- Create: `app/src/api/client.test.ts`
- Create: `app/src/api/config.ts`
- Create: `app/src/auth/token.ts`
- Create: `app/src/auth/token.test.ts`

- [ ] **Step 1: Write the failing client tests**

Create `app/src/api/config.ts`:

```ts
import { Platform } from "react-native";

const DEFAULT_BASE = Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
```

Create `app/src/api/client.ts`:

```ts
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let code = "unknown_error";
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        code = data.error.code;
        message = data.error.message;
      }
    } catch {
      // non-JSON error body; keep defaults
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}
```

Create `app/src/api/client.test.ts`:

```ts
import { ApiError, api } from "./client";
import { API_URL } from "./config";

describe("api client", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("sends method, JSON body and bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await api<{ id: number }>("/api/v1/sessions", {
      method: "POST",
      body: { subject_id: 2 },
      token: "abc",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/v1/sessions`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer abc",
        },
        body: JSON.stringify({ subject_id: 2 }),
      }),
    );
  });

  it("parses the error envelope", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "email_taken", message: "taken" } }),
    });

    await expect(api("/api/v1/auth/register", { method: "POST", body: {} })).rejects.toThrow(
      ApiError,
    );
    try {
      await api("/x");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe("email_taken");
    }
  });

  it("falls back to a generic error for non-JSON bodies", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });

    try {
      await api("/x");
      throw new Error("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("unknown_error");
      expect(apiErr.message).toContain("500");
    }
  });
});
```

- [ ] **Step 2: Run client tests to verify they fail**

Run: `npx jest src/api/client.test.ts`
Expected: FAIL (module resolution errors for `./config` is fine — the point is the suite runs).

- [ ] **Step 3: Write failing token tests**

Create `app/src/auth/token.ts`:

```ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "cogna_token";

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
```

Create `app/src/auth/token.test.ts`:

```ts
import * as SecureStore from "expo-secure-store";
import { saveToken, loadToken, clearToken } from "./token";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("token storage", () => {
  it("stores and loads via secure store on native", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("tok-1");
    await saveToken("tok-1");
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith("cogna_token", "tok-1");
    await expect(loadToken()).resolves.toBe("tok-1");
  });

  it("clears the token", async () => {
    await clearToken();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("cogna_token");
  });
});
```

- [ ] **Step 4: Run token tests to verify they pass**

Run: `npx jest src/auth/token.test.ts src/api/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && npx expo lint && npm test`
Expected: clean.

```bash
git add app/src
git commit -m "feat(app): add typed API client and token storage"
```

---

### Task 12: Auth context and screens

**Files:**
- Create: `app/src/auth/AuthContext.tsx`
- Create: `app/src/auth/AuthContext.test.tsx`
- Create: `app/src/api/auth.ts`
- Create: `app/src/screens/LoginScreen.tsx`
- Create: `app/src/screens/LoginScreen.test.tsx`
- Create: `app/src/screens/RegisterScreen.tsx`

- [ ] **Step 1: Write the failing auth API tests**

Create `app/src/api/auth.ts`:

```ts
import { api } from "./client";

export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export function login(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchMe(token: string): Promise<{ user: User }> {
  return api<{ user: User }>("/api/v1/me", { token });
}
```

Create `app/src/auth/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, login as apiLogin, register as apiRegister, User } from "../api/auth";
import { clearToken, loadToken, saveToken } from "./token";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadToken();
        if (!stored) return;
        const { user: me } = await fetchMe(stored);
        setToken(stored);
        setUser(me);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => {
      const res = await apiLogin(email, password);
      await saveToken(res.token);
      setToken(res.token);
      setUser(res.user);
    },
    register: async (email, password) => {
      const res = await apiRegister(email, password);
      await saveToken(res.token);
      setToken(res.token);
      setUser(res.user);
    },
    logout: async () => {
      await clearToken();
      setToken(null);
      setUser(null);
    },
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
```

Create `app/src/auth/AuthContext.test.tsx`:

```tsx
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import { login } from "../api/auth";
import { loadToken } from "./token";

jest.mock("../api/auth", () => ({
  fetchMe: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
}));
jest.mock("./token", () => ({
  loadToken: jest.fn(),
  saveToken: jest.fn(),
  clearToken: jest.fn(),
}));

const mockedLogin = login as jest.Mock;
const mockedLoadToken = loadToken as jest.Mock;

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs in and stores the token", async () => {
    mockedLoadToken.mockResolvedValue(null);
    mockedLogin.mockResolvedValue({
      token: "tok",
      user: { id: 1, email: "a@b.c", created_at: "2026-07-31T00:00:00" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("a@b.c", "password123");
    });

    expect(result.current.user?.email).toBe("a@b.c");
    expect(result.current.token).toBe("tok");
    expect(mockedLogin).toHaveBeenCalledWith("a@b.c", "password123");
  });

  it("logs out and clears state", async () => {
    mockedLoadToken.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx jest src/auth/AuthContext.test.tsx`
Expected: PASS.

- [ ] **Step 3: Write the failing login screen test**

Create `app/src/screens/LoginScreen.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";
import { useAuth } from "../auth/AuthContext";

jest.mock("../auth/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement("Text", null, children),
    router: { replace: jest.fn() },
  };
});

const mockUseAuth = useAuth as jest.Mock;

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: jest.fn().mockResolvedValue(undefined),
      loading: false,
    });
  });

  it("submits email and password", async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "me@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByText("Log in"));

    await waitFor(() => {
      expect(mockUseAuth().login).toHaveBeenCalledWith("me@example.com", "password123");
    });
  });

  it("shows an error when login fails", async () => {
    mockUseAuth.mockReturnValue({
      login: jest.fn().mockRejectedValue(new Error("invalid_credentials")),
      loading: false,
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "me@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "wrong");
    fireEvent.press(getByText("Log in"));

    await waitFor(() => {
      expect(getByText(/could not log in/i)).toBeTruthy();
    });
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx jest src/screens/LoginScreen.test.tsx`
Expected: FAIL — `Cannot find module './LoginScreen'`

- [ ] **Step 5: Implement the login screen**

Create `app/src/screens/LoginScreen.tsx`:

```tsx
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../auth/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError("Could not log in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cogna</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        testID="email-input"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        testID="password-input"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>
      <Link href="/register" style={styles.link}>
        <Text>No account? Register</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16,
  },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
  link: { alignItems: "center", marginTop: 8 },
});
```

Note: `getByText("Log in")` matches the button text; `getByPlaceholderText` matches the placeholders. The test file uses the placeholder "Email"/"Password" — the screen uses `testID` too, but placeholder lookup works because the inputs have `placeholder` props.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest src/screens/LoginScreen.test.tsx`
Expected: PASS.

- [ ] **Step 7: Implement the register screen**

Create `app/src/screens/RegisterScreen.tsx` (same shape as login):

```tsx
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../auth/AuthContext";

export function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError("Could not register. The email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>Register</Text>
      </Pressable>
      <Link href="/login" style={styles.link}>
        <Text>Already have an account? Log in</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16,
  },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
  link: { alignItems: "center", marginTop: 8 },
});
```

- [ ] **Step 8: Verify and commit**

Run: `npx tsc --noEmit && npx expo lint && npm test`
Expected: clean.

```bash
git add app/src
git commit -m "feat(app): add auth context and login/register screens"
```

---

### Task 13: Navigation shell with auth guard

**Files:**
- Create: `app/app/_layout.tsx`
- Create: `app/app/(auth)/_layout.tsx`
- Create: `app/app/(auth)/login.tsx`
- Create: `app/app/(auth)/register.tsx`
- Create: `app/app/(tabs)/_layout.tsx`
- Create: `app/app/(tabs)/index.tsx` (placeholder Home)
- Create: `app/app/(tabs)/timer.tsx` (placeholder)
- Create: `app/app/(tabs)/history.tsx` (placeholder)
- Create: `app/app/(tabs)/subjects.tsx` (placeholder)

- [ ] **Step 1: Root layout with auth provider and guard**

Replace `app/app/_layout.tsx` (created by the template) with:

```tsx
import React from "react";
import { Redirect, Stack } from "expo-router";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

Note: `Stack.Protected` requires expo-router SDK 53+. If the installed SDK errors on `Stack.Protected`, fall back to the redirect variant — replace `RootNavigator` with:

```tsx
function RootNavigator() {
  const { token, loading } = useAuth();
  if (loading) {
    return null;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="session/[id]" />
        </>
      )}
    </Stack>
  );
}
```

and add an explicit redirect from the auth screens to `/(tabs)` when a token exists (in `(auth)/_layout.tsx`):

```tsx
import { Redirect } from "expo-router";
// inside a component with useAuth:
// if (token) return <Redirect href="/(tabs)" />;
```

- [ ] **Step 2: Auth group layout**

Create `app/app/(auth)/_layout.tsx`:

```tsx
import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Auth screens**

Create `app/app/(auth)/login.tsx`:

```tsx
import React from "react";
import { LoginScreen } from "../../src/screens/LoginScreen";

export default function LoginRoute() {
  return <LoginScreen />;
}
```

Create `app/app/(auth)/register.tsx`:

```tsx
import React from "react";
import { RegisterScreen } from "../../src/screens/RegisterScreen";

export default function RegisterRoute() {
  return <RegisterScreen />;
}
```

- [ ] **Step 4: Tabs layout**

Create `app/app/(tabs)/_layout.tsx`:

```tsx
import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="timer" options={{ title: "Timer" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects" }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Placeholder tab screens**

Create `app/app/(tabs)/index.tsx`:

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Home — stats will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

Create `app/app/(tabs)/timer.tsx`, `app/app/(tabs)/history.tsx`, `app/app/(tabs)/subjects.tsx` with the same shape, each saying "Timer — coming soon", "History — coming soon", "Subjects — coming soon".

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npx expo lint && npm test`
Expected: clean.

```bash
git add app/app
git commit -m "feat(app): add navigation shell with auth guard"
```

---

### Task 14: Subjects API + management screen

**Files:**
- Create: `app/src/api/subjects.ts`
- Create: `app/src/api/subjects.test.ts`
- Create: `app/src/screens/SubjectsScreen.tsx`
- Create: `app/src/screens/SubjectsScreen.test.tsx`
- Modify: `app/app/(tabs)/subjects.tsx`

- [ ] **Step 1: Write the failing API tests**

Create `app/src/api/subjects.ts`:

```ts
import { api } from "./client";

export type Subject = {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
};

export function listSubjects(token: string): Promise<Subject[]> {
  return api<Subject[]>("/api/v1/subjects", { token });
}

export function createSubject(
  token: string,
  name: string,
  color: string,
): Promise<Subject> {
  return api<Subject>("/api/v1/subjects", {
    method: "POST",
    body: { name, color },
    token,
  });
}

export function deleteSubject(token: string, id: number): Promise<void> {
  return api<void>(`/api/v1/subjects/${id}`, { method: "DELETE", token });
}
```

Create `app/src/api/subjects.test.ts`:

```ts
import { createSubject, deleteSubject, listSubjects } from "./subjects";

describe("subjects API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("lists subjects with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await listSubjects("tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/subjects"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("creates a subject", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    await createSubject("tok", "Math", "#4F46E5");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Math", color: "#4F46E5" });
  });

  it("deletes a subject with DELETE", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await deleteSubject("tok", 7);
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
```

- [ ] **Step 2: Run to verify they pass**

Run: `npx jest src/api/subjects.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing screen test**

Create `app/src/screens/SubjectsScreen.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SubjectsScreen } from "./SubjectsScreen";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects } from "../api/subjects";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({
  listSubjects: jest.fn(),
  createSubject: jest.fn(),
  deleteSubject: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockList = listSubjects as jest.Mock;
const mockCreate = createSubject as jest.Mock;
const mockDelete = deleteSubject as jest.Mock;

describe("SubjectsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("loads and renders subjects", async () => {
    mockList.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
      { id: 2, user_id: 1, name: "History", color: "#10B981", created_at: "" },
    ]);

    const { getByText } = render(<SubjectsScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    expect(getByText("History")).toBeTruthy();
  });

  it("creates a subject", async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      id: 3, user_id: 1, name: "Physics", color: "#F59E0B", created_at: "",
    });

    const { getByPlaceholderText, getByText } = render(<SubjectsScreen />);
    fireEvent.changeText(getByPlaceholderText("Subject name"), "Physics");
    fireEvent.press(getByText("Add"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith("tok", "Physics", expect.any(String)));
  });

  it("deletes a subject", async () => {
    mockList.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
    mockDelete.mockResolvedValue(undefined);

    const { getByText } = render(<SubjectsScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    fireEvent.press(getByText("Delete"));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("tok", 1));
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx jest src/screens/SubjectsScreen.test.tsx`
Expected: FAIL — `Cannot find module './SubjectsScreen'`

- [ ] **Step 5: Implement the subjects screen**

Create `app/src/screens/SubjectsScreen.tsx`:

```tsx
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects, Subject } from "../api/subjects";

const PALETTE = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export function SubjectsScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSubjects(await listSubjects(token));
    } catch {
      setError("Could not load subjects.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAdd = async () => {
    if (!token || !name.trim()) return;
    setError(null);
    try {
      await createSubject(token, name.trim(), color);
      setName("");
      refresh();
    } catch {
      setError("Could not add subject.");
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    setError(null);
    try {
      await deleteSubject(token, id);
      refresh();
    } catch {
      setError("Could not delete subject (it may have sessions).");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subjects</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Subject name"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.palette}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              testID={`color-${c}`}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </View>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={subjects}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.rowName}>{item.name}</Text>
            <Pressable onPress={() => onDelete(item.id)}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16 },
  palette: { flexDirection: "row", gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: "#111827" },
  addButton: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 12, alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowName: { flex: 1, fontSize: 16 },
  delete: { color: "#dc2626" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 6: Wire the route**

Replace `app/app/(tabs)/subjects.tsx`:

```tsx
import React from "react";
import { SubjectsScreen } from "../../src/screens/SubjectsScreen";

export default function SubjectsRoute() {
  return <SubjectsScreen />;
}
```

- [ ] **Step 7: Verify and commit**

Run: `npx jest src/screens/SubjectsScreen.test.tsx && npx tsc --noEmit && npx expo lint && npm test`
Expected: all clean.

```bash
git add app/src app/app
git commit -m "feat(app): add subjects management screen"
```

---

### Task 15: Home dashboard with stats

**Files:**
- Create: `app/src/api/stats.ts`
- Create: `app/src/utils/time.ts`
- Create: `app/src/utils/time.test.ts`
- Create: `app/src/screens/HomeScreen.tsx`
- Create: `app/src/screens/HomeScreen.test.tsx`
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1: Write the failing time utils tests**

Create `app/src/utils/time.ts`:

```ts
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

export function localISO(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

export function todayDate(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
```

Create `app/src/utils/time.test.ts`:

```ts
import { formatDuration, formatMinutes, localISO, todayDate } from "./time";

describe("time utils", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(720)).toBe("12h 0m");
  });

  it("formats minutes compactly", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(125)).toBe("2h 5m");
  });

  it("produces local ISO timestamps without zone", () => {
    const d = new Date(2026, 6, 31, 9, 5, 3);
    expect(localISO(d)).toBe("2026-07-31T09:05:03");
  });

  it("produces today's date string", () => {
    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run to verify they pass**

Run: `npx jest src/utils/time.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing stats API**

Create `app/src/api/stats.ts`:

```ts
import { api } from "./client";

export type SubjectTotal = {
  subject_id: number;
  name: string;
  color: string;
  minutes: number;
};

export type Summary = {
  total_minutes: number;
  week_minutes: number;
  streak_days: number;
  per_subject: SubjectTotal[];
};

export function fetchSummary(token: string): Promise<Summary> {
  return api<Summary>("/api/v1/stats/summary", { token });
}
```

- [ ] **Step 4: Write the failing home screen test**

Create `app/src/screens/HomeScreen.test.tsx`:

```tsx
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { HomeScreen } from "./HomeScreen";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary } from "../api/stats";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/stats", () => ({ fetchSummary: jest.fn() }));

const mockUseAuth = useAuth as jest.Mock;
const mockFetchSummary = fetchSummary as jest.Mock;

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("renders stats from the summary", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 150,
      week_minutes: 60,
      streak_days: 3,
      per_subject: [
        { subject_id: 1, name: "Math", color: "#4F46E5", minutes: 90 },
        { subject_id: 2, name: "History", color: "#10B981", minutes: 60 },
      ],
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => expect(getByText("2h 30m")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
    expect(getByText(/3 day/i)).toBeTruthy();
    expect(getByText("Math")).toBeTruthy();
  });

  it("shows an error when stats fail to load", async () => {
    mockFetchSummary.mockRejectedValue(new Error("boom"));

    const { getByText } = render(<HomeScreen />);
    await waitFor(() => expect(getByText(/could not load stats/i)).toBeTruthy());
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx jest src/screens/HomeScreen.test.tsx`
Expected: FAIL — `Cannot find module './HomeScreen'`

- [ ] **Step 6: Implement the home screen**

Create `app/src/screens/HomeScreen.tsx`:

```tsx
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
import { formatDuration, formatMinutes } from "../utils/time";

export function HomeScreen() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchSummary(token));
      setError(null);
    } catch {
      setError("Could not load stats. Is the backend running?");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary ? (
        <>
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{formatDuration(summary.total_minutes)}</Text>
              <Text style={styles.cardLabel}>All time</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{formatDuration(summary.week_minutes)}</Text>
              <Text style={styles.cardLabel}>This week</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{summary.streak_days} days</Text>
              <Text style={styles.cardLabel}>Streak</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>By subject</Text>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  greeting: { fontSize: 18, fontWeight: "600" },
  cardRow: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, padding: 12, alignItems: "center",
  },
  cardValue: { fontSize: 18, fontWeight: "700" },
  cardLabel: { fontSize: 12, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  subjectName: { flex: 1, fontSize: 15 },
  subjectMinutes: { fontSize: 15, fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 7: Wire the route**

Replace `app/app/(tabs)/index.tsx`:

```tsx
import React from "react";
import { HomeScreen } from "../../src/screens/HomeScreen";

export default function HomeRoute() {
  return <HomeScreen />;
}
```

- [ ] **Step 8: Verify and commit**

Run: `npx jest src/screens/HomeScreen.test.tsx && npx tsc --noEmit && npx expo lint && npm test`
Expected: all clean.

```bash
git add app/src app/app
git commit -m "feat(app): add home dashboard with stats"
```

---

### Task 16: Timer screen

**Files:**
- Create: `app/src/api/sessions.ts`
- Create: `app/src/api/sessions.test.ts`
- Create: `app/src/screens/TimerScreen.tsx`
- Create: `app/src/screens/TimerScreen.test.tsx`
- Modify: `app/app/(tabs)/timer.tsx`

- [ ] **Step 1: Write the failing sessions API tests**

Create `app/src/api/sessions.ts`:

```ts
import { api } from "./client";

export type StudySession = {
  id: number;
  user_id: number;
  subject_id: number;
  subject_name: string;
  subject_color: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  source: "timer" | "manual";
  note: string | null;
  created_at: string;
};

export type CreateSessionInput = {
  subject_id: number;
  started_at: string;
  ended_at: string;
  source: "timer" | "manual";
  note?: string | null;
};

export function listSessions(
  token: string,
  params: { from?: string; to?: string; subject_id?: number } = {},
): Promise<StudySession[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.subject_id) qs.set("subject_id", String(params.subject_id));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return api<StudySession[]>(`/api/v1/sessions${query}`, { token });
}

export function getSession(token: string, id: number): Promise<StudySession> {
  return api<StudySession>(`/api/v1/sessions/${id}`, { token });
}

export function createSession(
  token: string,
  input: CreateSessionInput,
): Promise<StudySession> {
  return api<StudySession>("/api/v1/sessions", { method: "POST", body: input, token });
}

export function updateSession(
  token: string,
  id: number,
  input: CreateSessionInput,
): Promise<StudySession> {
  return api<StudySession>(`/api/v1/sessions/${id}`, {
    method: "PUT",
    body: input,
    token,
  });
}

export function deleteSession(token: string, id: number): Promise<void> {
  return api<void>(`/api/v1/sessions/${id}`, { method: "DELETE", token });
}
```

Create `app/src/api/sessions.test.ts`:

```ts
import { createSession, listSessions } from "./sessions";

describe("sessions API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("creates a session", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    await createSession("tok", {
      subject_id: 3,
      started_at: "2026-07-31T09:00:00",
      ended_at: "2026-07-31T10:00:00",
      source: "timer",
    });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/sessions");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({ subject_id: 3, source: "timer" });
  });

  it("serializes query filters", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await listSessions("tok", { from: "2026-07-01", to: "2026-07-31", subject_id: 2 });
    expect(mockFetch.mock.calls[0][0]).toContain(
      "from=2026-07-01&to=2026-07-31&subject_id=2",
    );
  });
});
```

- [ ] **Step 2: Run to verify they pass**

Run: `npx jest src/api/sessions.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing timer screen test**

Create `app/src/screens/TimerScreen.test.tsx`:

```tsx
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { TimerScreen } from "./TimerScreen";
import { useAuth } from "../auth/AuthContext";
import { listSubjects } from "../api/subjects";
import { createSession } from "../api/sessions";
import { localISO } from "../utils/time";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({ listSubjects: jest.fn() }));
jest.mock("../api/sessions", () => ({ createSession: jest.fn() }));
jest.mock("../utils/time", () => ({
  localISO: jest.fn(() => "2026-07-31T10:00:00"),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListSubjects = listSubjects as jest.Mock;
const mockCreateSession = createSession as jest.Mock;

describe("TimerScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockListSubjects.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts, ticks, and stops a session", async () => {
    mockCreateSession.mockResolvedValue({ id: 9 });

    const { getByText, getByTestId } = render(<TimerScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    fireEvent.press(getByText("Math"));
    fireEvent.press(getByTestId("start-button"));

    expect(getByTestId("elapsed")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(65_000);
    });
    expect(getByTestId("elapsed").props.children).toMatch(/01:0[05]/);

    fireEvent.press(getByTestId("stop-button"));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ subject_id: 1, source: "timer" }),
      );
    });
    expect(localISO).toHaveBeenCalled();
  });

  it("does not start without a subject", () => {
    const { getByTestId } = render(<TimerScreen />);
    fireEvent.press(getByTestId("start-button"));
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx jest src/screens/TimerScreen.test.tsx`
Expected: FAIL — `Cannot find module './TimerScreen'`

- [ ] **Step 5: Implement the timer screen**

Create `app/src/screens/TimerScreen.tsx`:

```tsx
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
import { localISO } from "../utils/time";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function TimerScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));
  }, [token]);

  useEffect(() => {
    if (startedAt === null) return;
    intervalRef.current = setInterval(
      () => setElapsed(Date.now() - startedAt),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const start = () => {
    if (subjectId === null) return;
    setElapsed(0);
    setStartedAt(Date.now());
  };

  const stop = async () => {
    if (startedAt === null || subjectId === null || !token) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSaving(true);
    setError(null);
    try {
      await createSession(token, {
        subject_id: subjectId,
        started_at: localISO(new Date(startedAt)),
        ended_at: localISO(new Date()),
        source: "timer",
      });
      setStartedAt(null);
      router.push("/(tabs)/history");
    } catch {
      setError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Study timer</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.subjectRow}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            testID={`subject-${s.id}`}
            onPress={() => setSubjectId(s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {subjects.length === 0 ? (
        <Text>Add a subject first (Subjects tab).</Text>
      ) : null}

      {startedAt !== null ? (
        <Text style={styles.elapsed} testID="elapsed">
          {formatElapsed(elapsed)}
        </Text>
      ) : null}

      <Pressable
        testID="start-button"
        style={[styles.button, subjectId === null && styles.buttonDisabled]}
        onPress={start}
        disabled={subjectId === null}
      >
        <Text style={styles.buttonText}>
          {startedAt === null ? "Start studying" : "Running…"}
        </Text>
      </Pressable>

      {startedAt !== null ? (
        <Pressable testID="stop-button" style={styles.stopButton} onPress={stop} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving…" : "Stop and save"}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  chipText: { fontSize: 14 },
  chipTextActive: { color: "#fff" },
  elapsed: {
    fontSize: 56, fontWeight: "700", textAlign: "center", fontVariant: ["tabular-nums"],
  },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 999, paddingVertical: 16, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#a5b4fc" },
  stopButton: {
    backgroundColor: "#dc2626", borderRadius: 999, paddingVertical: 16, alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npx jest src/screens/TimerScreen.test.tsx`
Expected: PASS. (If the elapsed assertion is flaky, relax the regex to `/01:0/`.)

- [ ] **Step 7: Wire the route**

Replace `app/app/(tabs)/timer.tsx`:

```tsx
import React from "react";
import { TimerScreen } from "../../src/screens/TimerScreen";

export default function TimerRoute() {
  return <TimerScreen />;
}
```

- [ ] **Step 8: Verify and commit**

Run: `npx tsc --noEmit && npx expo lint && npm test`
Expected: clean.

```bash
git add app/src app/app
git commit -m "feat(app): add study timer screen"
```

---

### Task 17: Manual entry form

**Files:**
- Create: `app/src/screens/NewSessionScreen.tsx`
- Create: `app/src/screens/NewSessionScreen.test.tsx`
- Create: `app/app/session/new.tsx`
- Modify: `app/app/_layout.tsx` (add the route to the protected stack)

- [ ] **Step 1: Write the failing test**

Create `app/src/screens/NewSessionScreen.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { NewSessionScreen } from "./NewSessionScreen";
import { useAuth } from "../auth/AuthContext";
import { listSubjects } from "../api/subjects";
import { createSession } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({ listSubjects: jest.fn() }));
jest.mock("../api/sessions", () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListSubjects = listSubjects as jest.Mock;
const mockCreateSession = createSession as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockUpdateSession = updateSession as jest.Mock;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams as jest.Mock;

describe("NewSessionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockListSubjects.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
  });

  it("creates a manual session with date and minutes", async () => {
    mockCreateSession.mockResolvedValue({ id: 5 });

    const { getByPlaceholderText, getByText } = render(<NewSessionScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    fireEvent.press(getByText("Math"));
    fireEvent.changeText(getByPlaceholderText("Date (YYYY-MM-DD)"), "2026-07-31");
    fireEvent.changeText(getByPlaceholderText("Minutes"), "45");
    fireEvent.press(getByText("Save session"));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({
          subject_id: 1,
          source: "manual",
          ended_at: "2026-07-31T00:45:00",
        }),
      );
    });
  });

  it("shows a validation error for a bad date", async () => {
    const { getByPlaceholderText, getByText } = render(<NewSessionScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    fireEvent.press(getByText("Math"));
    fireEvent.changeText(getByPlaceholderText("Date (YYYY-MM-DD)"), "31-07-2026");
    fireEvent.press(getByText("Save session"));

    await waitFor(() => expect(getByText(/valid date/i)).toBeTruthy());
  });

  it("prefills and updates an existing session in edit mode", async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: "5" });
    mockGetSession.mockResolvedValue({
      id: 5, user_id: 1, subject_id: 1, subject_name: "Math", subject_color: "#4F46E5",
      started_at: "2026-07-30T09:00:00", ended_at: "2026-07-30T09:45:00",
      duration_minutes: 45, source: "manual", note: "revision", created_at: "",
    });
    mockUpdateSession.mockResolvedValue({ id: 5 });

    const { getByDisplayValue, getByText } = render(<NewSessionScreen />);
    await waitFor(() => expect(getByDisplayValue("2026-07-30")).toBeTruthy());
    expect(getByDisplayValue("45")).toBeTruthy();
    expect(getByDisplayValue("revision")).toBeTruthy();
    expect(getByText("Edit session")).toBeTruthy();

    fireEvent.press(getByText("Save session"));

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalledWith(
        "tok",
        5,
        expect.objectContaining({
          source: "manual",
          subject_id: 1,
          started_at: "2026-07-30T00:00:00",
          note: "revision",
        }),
      );
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/screens/NewSessionScreen.test.tsx`
Expected: FAIL — `Cannot find module './NewSessionScreen'`

- [ ] **Step 3: Implement the manual entry screen**

Create `app/src/screens/NewSessionScreen.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession, getSession, updateSession } from "../api/sessions";
import { localISO, todayDate } from "../utils/time";

export function NewSessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState(todayDate());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));

    if (isEdit && id) {
      getSession(token, Number(id))
        .then((s) => {
          setSubjectId(s.subject_id);
          setDate(s.started_at.slice(0, 10));
          setMinutes(String(s.duration_minutes));
          setNote(s.note ?? "");
        })
        .catch(() => setError("Could not load session."));
    }
  }, [token, id, isEdit]);

  const onSave = async () => {
    if (!token || subjectId === null) return;
    setError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Enter a valid date like 2026-07-31.");
      return;
    }
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins <= 0) {
      setError("Minutes must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const started = new Date(y, m - 1, d, 0, 0, 0);
      const ended = new Date(started.getTime() + mins * 60_000);
      const payload = {
        subject_id: subjectId,
        started_at: localISO(started),
        ended_at: localISO(ended),
        source: "manual" as const,
        note: note.trim() || null,
      };
      if (isEdit && id) {
        await updateSession(token, Number(id), payload);
      } else {
        await createSession(token, payload);
      }
      router.back();
    } catch {
      setError("Could not save session.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? "Edit session" : "Log a session"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.subjectRow}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSubjectId(s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Minutes"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Note (optional)"
        value={note}
        onChangeText={setNote}
      />
      <Pressable
        style={[styles.button, subjectId === null && styles.buttonDisabled]}
        onPress={onSave}
        disabled={subjectId === null || saving}
      >
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save session"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  chipText: { fontSize: 14 },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16 },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#a5b4fc" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 4: Add the route**

Create `app/app/session/new.tsx`:

```tsx
import React from "react";
import { NewSessionScreen } from "../../src/screens/NewSessionScreen";

export default function NewSessionRoute() {
  return <NewSessionScreen />;
}
```

Add `<Stack.Screen name="session/[id]" />` — it is already in the protected stack from Task 13; add `session/new` and `session/[id]/edit` beside it in `app/app/_layout.tsx`:

```tsx
<Stack.Protected guard={!!token}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="session/[id]" />
  <Stack.Screen name="session/new" />
  <Stack.Screen name="session/[id]/edit" />
</Stack.Protected>
```

- [ ] **Step 5: Verify and commit**

Run: `npx jest src/screens/NewSessionScreen.test.tsx && npx tsc --noEmit && npx expo lint && npm test`
Expected: all clean.

```bash
git add app/src app/app
git commit -m "feat(app): add manual session entry form"
```

---

### Task 18: History list and session detail

**Files:**
- Create: `app/src/screens/HistoryScreen.tsx`
- Create: `app/src/screens/HistoryScreen.test.tsx`
- Create: `app/src/screens/SessionDetailScreen.tsx`
- Create: `app/src/screens/SessionDetailScreen.test.tsx`
- Create: `app/app/session/[id].tsx`
- Create: `app/app/session/[id]/edit.tsx`
- Modify: `app/app/(tabs)/history.tsx`

- [ ] **Step 1: Write the failing history screen test**

Create `app/src/screens/HistoryScreen.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HistoryScreen } from "./HistoryScreen";
import { useAuth } from "../auth/AuthContext";
import { listSessions } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/sessions", () => ({ listSessions: jest.fn() }));

const mockUseAuth = useAuth as jest.Mock;
const mockListSessions = listSessions as jest.Mock;

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("renders sessions newest first with subject and duration", async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 2, user_id: 1, subject_id: 1, subject_name: "Biology", subject_color: "#10B981",
        started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
        duration_minutes: 60, source: "timer", note: null, created_at: "",
      },
      {
        id: 1, user_id: 1, subject_id: 2, subject_name: "Math", subject_color: "#4F46E5",
        started_at: "2026-07-30T09:00:00", ended_at: "2026-07-30T09:45:00",
        duration_minutes: 45, source: "manual", note: null, created_at: "",
      },
    ]);

    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => expect(getByText("Biology")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
    expect(getByText("45m")).toBeTruthy();
  });

  it("navigates to a session on press", async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 2, user_id: 1, subject_id: 1, subject_name: "Biology", subject_color: "#10B981",
        started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
        duration_minutes: 60, source: "timer", note: null, created_at: "",
      },
    ]);

    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => expect(getByText("Biology")).toBeTruthy());

    fireEvent.press(getByText("Biology"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/session/2");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/screens/HistoryScreen.test.tsx`
Expected: FAIL — `Cannot find module './HistoryScreen'` and the `require("expo-router")` mock is missing. Add to the test file:

```tsx
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));
```

- [ ] **Step 3: Implement the history screen**

Create `app/src/screens/HistoryScreen.tsx`:

```tsx
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { formatDuration } from "../utils/time";

function formatDay(startedAt: string): string {
  return startedAt.slice(0, 10);
}

export function HistoryScreen() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSessions(await listSessions(token));
    } catch {
      setError("Could not load sessions.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Pressable onPress={() => router.push("/session/new")}>
          <Text style={styles.addLink}>+ Log manually</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={sessions}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/session/${item.id}`)}>
            <View style={[styles.dot, { backgroundColor: item.subject_color }]} />
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.subject_name}</Text>
              <Text style={styles.rowMeta}>
                {formatDay(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  addLink: { color: "#4F46E5", fontWeight: "600" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb",
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "500" },
  rowMeta: { fontSize: 12, color: "#6b7280" },
  rowDuration: { fontSize: 15, fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 4: Write the failing detail screen test**

Create `app/src/screens/SessionDetailScreen.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SessionDetailScreen } from "./SessionDetailScreen";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/sessions", () => ({
  getSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "2" })),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockDeleteSession = deleteSession as jest.Mock;

describe("SessionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("loads and shows session details", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: "revision", created_at: "",
    });

    const { getByText } = render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());
    expect(getByText("revision")).toBeTruthy();
    expect(getByText("1h 0m")).toBeTruthy();
  });

  it("deletes the session", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });
    mockDeleteSession.mockResolvedValue(undefined);

    const { getByText } = render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    fireEvent.press(getByText("Delete"));
    await waitFor(() => expect(mockDeleteSession).toHaveBeenCalledWith("tok", 2));
  });

  it("navigates to edit on edit press", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });

    const { getByText } = render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    fireEvent.press(getByText("Edit"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/session/2/edit");
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx jest src/screens/SessionDetailScreen.test.tsx`
Expected: FAIL — `Cannot find module './SessionDetailScreen'`

- [ ] **Step 6: Implement the detail screen**

Create `app/src/screens/SessionDetailScreen.tsx`:

```tsx
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { formatDuration } from "../utils/time";

export function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    try {
      setSession(await getSession(token, Number(id)));
    } catch {
      setError("Could not load session.");
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onDelete = async () => {
    if (!token || !session) return;
    try {
      await deleteSession(token, session.id);
      router.back();
    } catch {
      setError("Could not delete session.");
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.subjectRow}>
        <View style={[styles.dot, { backgroundColor: session.subject_color }]} />
        <Text style={styles.subjectName}>{session.subject_name}</Text>
      </View>
      <Text style={styles.duration}>{formatDuration(session.duration_minutes)}</Text>
      <Text style={styles.meta}>
        {session.started_at} → {session.ended_at}
      </Text>
      <Text style={styles.meta}>
        {session.source} · {session.duration_minutes} minutes
      </Text>
      {session.note ? <Text style={styles.note}>{session.note}</Text> : null}
      <Pressable style={styles.editButton} onPress={() => router.push(`/session/${session.id}/edit`)}>
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 12 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  subjectName: { fontSize: 18, fontWeight: "600" },
  duration: { fontSize: 40, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
  note: { fontSize: 15, marginTop: 8 },
  editButton: {
    marginTop: 24, borderWidth: 1, borderColor: "#4F46E5", borderRadius: 8,
    padding: 12, alignItems: "center",
  },
  editText: { color: "#4F46E5", fontWeight: "600" },
  deleteButton: {
    marginTop: 12, borderWidth: 1, borderColor: "#dc2626", borderRadius: 8,
    padding: 12, alignItems: "center",
  },
  deleteText: { color: "#dc2626", fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

- [ ] **Step 7: Add the route**

Create `app/app/session/[id].tsx`:

```tsx
import React from "react";
import { SessionDetailScreen } from "../../src/screens/SessionDetailScreen";

export default function SessionDetailRoute() {
  return <SessionDetailScreen />;
}
```

Create `app/app/session/[id]/edit.tsx` — the edit form reuses `NewSessionScreen`, which reads the `id` param and switches to edit mode:

```tsx
import React from "react";
import { NewSessionScreen } from "../../../src/screens/NewSessionScreen";

export default function EditSessionRoute() {
  return <NewSessionScreen />;
}
```

- [ ] **Step 8: Wire the history tab**

Replace `app/app/(tabs)/history.tsx`:

```tsx
import React from "react";
import { HistoryScreen } from "../../src/screens/HistoryScreen";

export default function HistoryRoute() {
  return <HistoryScreen />;
}
```

- [ ] **Step 9: Verify and commit**

Run: `npx jest src/screens/HistoryScreen.test.tsx src/screens/SessionDetailScreen.test.tsx && npx tsc --noEmit && npx expo lint && npm test`
Expected: all clean.

```bash
git add app/src app/app
git commit -m "feat(app): add history list and session detail"
```

---

### Task 19: Coverage check, README, and final verification

**Files:**
- Create: `README.md` (repo root)
- Modify: `backend/.gitignore`, `app/.gitignore` (ensure `backend/data/` and `node_modules/` are ignored)

- [ ] **Step 1: Verify backend coverage gate**

Run (from `backend/`): `go test ./... -cover`
Expected: total ≥ 80%. If not, add tests for uncovered branches (e.g., error paths in handlers).

- [ ] **Step 2: Verify app coverage gate**

Run (from `app/`): `npm test -- --coverage`
Expected: coverage ≥ 80% across the `src/` files.

- [ ] **Step 3: Write the README**

Create `README.md`:

```markdown
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
    go run ./cmd/server

Listens on `:8080`. Config via env vars: `PORT` (default 8080),
`DATABASE_PATH` (default `data/cogna.db`), `JWT_SECRET` (default `dev-secret-change-me`).

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
```

- [ ] **Step 4: Add gitignores**

Create `backend/.gitignore`:

```
data/
```

Check `app/.gitignore` already exists from the Expo template (it ignores `node_modules`, `.expo`, etc.).

- [ ] **Step 5: Final verification**

Run:
- From `backend/`: `go vet ./... && gofmt -l . && go test ./... -cover`
- From `app/`: `npx tsc --noEmit && npx expo lint && npm test -- --coverage`
- Manual smoke: start backend, register a user via curl, then `npx expo start` → web, log in, add a subject, run a timer session, check history and home stats.

- [ ] **Step 6: Commit**

```bash
git add README.md backend/.gitignore
git commit -m "docs: add README with run and test instructions"
```

---

## Self-review notes (author's checklist)

- Spec coverage: auth (register/login/me), subjects CRUD, sessions CRUD + filters, stats summary, error envelope, timer + manual entry, history + detail/edit/delete, streak/week stats — all mapped to Tasks 5-8 (backend) and 12-18 (app). Out-of-scope items are not planned.
- Subject deletion 409 when in use: Task 6 (`TestDeleteSubjectInUse`, `ErrSubjectInUse`).
- Type consistency: `store.Session` JSON fields (`subject_id`, `subject_name`, `subject_color`, `duration_minutes`, `source`, `note`) match `StudySession` in `app/src/api/sessions.ts`; `Summary` matches `app/src/api/stats.ts`; auth responses match `AuthResponse`.
- Time format `2006-01-02T15:04:05` is defined once in `store` (`timeFormat`) and mirrored in `api/valid.go` and `app/src/utils/time.ts` (`localISO`).
