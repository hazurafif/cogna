package store

import (
	"database/sql"
	"errors"
	"io/fs"
	"testing"
	"testing/fstest"

	_ "modernc.org/sqlite"
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

func mustCatalogSubject(t *testing.T, s *Store, name string) int64 {
	t.Helper()
	subs, err := s.ListSubjects()
	if err != nil {
		t.Fatalf("list subjects: %v", err)
	}
	for _, sub := range subs {
		if sub.Name == name {
			return sub.ID
		}
	}
	t.Fatalf("catalog has no subject %q", name)
	return 0
}

func TestListCatalog(t *testing.T) {
	s := newTestStore(t)

	subs, err := s.ListSubjects()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(subs) != 11 {
		t.Fatalf("catalog size = %d, want 11", len(subs))
	}
	names := map[string]bool{}
	for _, sub := range subs {
		names[sub.Name] = true
		if sub.Icon == "" {
			t.Fatalf("subject %q has no icon", sub.Name)
		}
	}
	for _, want := range []string{"math", "science", "language", "programming",
		"reading", "writing", "history", "music", "art", "test-prep", "other"} {
		if !names[want] {
			t.Fatalf("catalog missing %q, got %v", want, names)
		}
	}
}

func TestListCatalogIdenticalForAllUsers(t *testing.T) {
	s := newTestStore(t)
	_ = mustUser(t, s, "a@example.com")
	_ = mustUser(t, s, "b@example.com")

	subsA, err := s.ListSubjects()
	if err != nil {
		t.Fatalf("list A: %v", err)
	}
	subsB, err := s.ListSubjects()
	if err != nil {
		t.Fatalf("list B: %v", err)
	}
	if len(subsA) != len(subsB) {
		t.Fatalf("different catalog sizes: %d vs %d", len(subsA), len(subsB))
	}
	for i := range subsA {
		if subsA[i] != subsB[i] {
			t.Fatalf("catalogs differ at %d: %+v vs %+v", i, subsA[i], subsB[i])
		}
	}
}

func TestSubjectByID(t *testing.T) {
	s := newTestStore(t)
	mathID := mustCatalogSubject(t, s, "math")
	otherID := mustCatalogSubject(t, s, "other")

	got, err := s.SubjectByID(mathID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "math" {
		t.Fatalf("got %+v", got)
	}
	if _, err := s.SubjectByID(otherID); err != nil {
		t.Fatalf("get other: %v", err)
	}
	if _, err := s.SubjectByID(9999); !errors.Is(err, ErrSubjectNotFound) {
		t.Fatalf("err = %v, want ErrSubjectNotFound", err)
	}
}

func mustReadMigration(t *testing.T, path string) []byte {
	t.Helper()
	data, err := fs.ReadFile(migrationsFS, path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return data
}

func TestSubjectCatalogMigrationMapsLegacySubjects(t *testing.T) {
	db, err := sql.Open("sqlite", "file:legacymap?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("enable fk: %v", err)
	}

	// Apply only 0001 and 0002, then seed legacy per-user subjects.
	st := &Store{db: db}
	pre := fstest.MapFS{
		"migrations/0001_init.sql":        {Data: mustReadMigration(t, "migrations/0001_init.sql")},
		"migrations/0002_subject_icon.sql": {Data: mustReadMigration(t, "migrations/0002_subject_icon.sql")},
	}
	if err := st.migrateWith(pre); err != nil {
		t.Fatalf("migrate pre: %v", err)
	}

	// Seed a legacy user (pre-0004 schema has no name column) with raw SQL.
	userRes, err := db.Exec(
		`INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)`,
		"mig@example.com", "hash", "2026-07-01T00:00:00",
	)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	userID, err := userRes.LastInsertId()
	if err != nil {
		t.Fatalf("user id: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO subjects (user_id, name, icon, created_at) VALUES
		 (?, 'Math', 'book-open', '2026-07-01T00:00:00'),
		 (?, 'Interview Prep', 'briefcase', '2026-07-01T00:00:00')`,
		userID, userID,
	); err != nil {
		t.Fatalf("seed subjects: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO sessions (user_id, subject_id, started_at, ended_at, duration_minutes, source, created_at) VALUES
		 (?, 1, '2026-07-30T09:00:00', '2026-07-30T10:00:00', 60, 'timer', '2026-07-30T10:00:00'),
		 (?, 2, '2026-07-31T09:00:00', '2026-07-31T10:30:00', 90, 'manual', '2026-07-31T10:30:00')`,
		userID, userID,
	); err != nil {
		t.Fatalf("seed sessions: %v", err)
	}

	// Apply the remaining migrations (0003) and verify mapping.
	if err := st.migrateWith(migrationsFS); err != nil {
		t.Fatalf("migrate 0003: %v", err)
	}

	mathID := mustCatalogSubject(t, st, "math")
	otherID := mustCatalogSubject(t, st, "other")

	sess, _, err := st.ListSessions(userID, SessionFilter{})
	if err != nil {
		t.Fatalf("list sessions: %v", err)
	}
	if len(sess) != 2 {
		t.Fatalf("got %d sessions, want 2", len(sess))
	}
	bySubject := map[int64]string{}
	for _, s := range sess {
		bySubject[s.SubjectID] = s.SubjectName
	}
	if bySubject[mathID] != "math" {
		t.Fatalf("Math session not mapped to catalog: %+v", bySubject)
	}
	if bySubject[otherID] != "other" {
		t.Fatalf("unmatched session not mapped to other: %+v", bySubject)
	}

	// The legacy subjects table is gone and the catalog is queryable.
	var legacyTable int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='subjects'`,
	).Scan(&legacyTable); err != nil {
		t.Fatalf("query: %v", err)
	}
	if legacyTable != 0 {
		t.Fatal("legacy subjects table still exists")
	}
	subs, err := st.ListSubjects()
	if err != nil {
		t.Fatalf("list catalog: %v", err)
	}
	if len(subs) != 11 {
		t.Fatalf("catalog size = %d, want 11", len(subs))
	}
}
