package store

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"

	_ "modernc.org/sqlite"
)

func TestOpenCreatesDataDir(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "nested", "dir", "cogna.db")
	s, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()
	if _, err := os.Stat(filepath.Dir(dbPath)); err != nil {
		t.Fatalf("data dir not created: %v", err)
	}
}

func TestOpenRunsMigrations(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	var n int
	if err := s.db.QueryRow(
		`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'subject_catalog', 'sessions')`,
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

func TestMigrateRollsBackFailedMigration(t *testing.T) {
	good := `CREATE TABLE good_table (id INTEGER PRIMARY KEY);`
	bad := `CREATE TABLE bad_table (id INTEGER PRIMARY KEY); THIS IS NOT SQL;`
	fsys := fstest.MapFS{
		"migrations/0001_good.sql": {Data: []byte(good)},
		"migrations/0002_bad.sql":  {Data: []byte(bad)},
	}
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrateWith(fsys); err == nil {
		t.Fatal("expected migration to fail")
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = '0002_bad.sql'`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 0 {
		t.Fatalf("failed migration recorded as applied")
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='bad_table'`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 0 {
		t.Fatalf("partial schema left behind after rollback")
	}
}

func TestMigrateRetriesAfterFailure(t *testing.T) {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	badFS := fstest.MapFS{
		"migrations/0001_good.sql": {Data: []byte(`CREATE TABLE good_table (id INTEGER PRIMARY KEY);`)},
		"migrations/0002_bad.sql":  {Data: []byte(`NOT SQL`)},
	}
	if err := s.migrateWith(badFS); err == nil {
		t.Fatal("expected first migrate to fail")
	}
	goodFS := fstest.MapFS{
		"migrations/0001_good.sql":  {Data: []byte(`CREATE TABLE good_table (id INTEGER PRIMARY KEY);`)},
		"migrations/0002_fixed.sql": {Data: []byte(`CREATE TABLE fixed_table (id INTEGER PRIMARY KEY);`)},
	}
	if err := s.migrateWith(goodFS); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='fixed_table'`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 1 {
		t.Fatalf("retry did not apply the fixed migration")
	}
}

func TestMigrateIdempotentAcrossFileReopen(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "cogna.db")
	s, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open 1: %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	s2, err := Open(dbPath)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer s2.Close()
	var n int
	if err := s2.db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 6 {
		t.Fatalf("migrations recorded = %d, want 6", n)
	}
}

func TestOpenFailsOnBadPath(t *testing.T) {
	blocker := filepath.Join(t.TempDir(), "blocker")
	if err := os.WriteFile(blocker, nil, 0o644); err != nil {
		t.Fatalf("write blocker: %v", err)
	}
	if _, err := Open(filepath.Join(blocker, "missing", "cogna.db")); err == nil {
		t.Fatal("expected error for unopenable path")
	}
}

func TestMigrateWithMissingMigrationsDir(t *testing.T) {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrateWith(fstest.MapFS{}); err == nil {
		t.Fatal("expected error for missing migrations dir")
	}
}

func TestMigrateUpgradesPreIconDatabase(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "cogna.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open raw db: %v", err)
	}
	legacy := `CREATE TABLE users (
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
	CREATE TABLE schema_migrations (version TEXT PRIMARY KEY);
	INSERT INTO schema_migrations (version) VALUES ('0001_init.sql');`
	if _, err := db.Exec(legacy); err != nil {
		t.Fatalf("seed legacy schema: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO users (email, password_hash, created_at) VALUES ('legacy@example.com', 'hash', '2026-07-01T00:00:00')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO subjects (user_id, name, color, created_at) VALUES (1, 'Old Math', '#4F46E5', '2026-07-01T00:00:00')`); err != nil {
		t.Fatalf("seed subject: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO sessions (user_id, subject_id, started_at, ended_at, duration_minutes, source, created_at)
		 VALUES (1, 1, '2026-07-30T09:00:00', '2026-07-30T10:00:00', 60, 'timer', '2026-07-30T10:00:00')`); err != nil {
		t.Fatalf("seed session: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close raw db: %v", err)
	}

	s, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	subs, err := s.ListSubjects()
	if err != nil {
		t.Fatalf("list subjects: %v", err)
	}
	if len(subs) != 11 {
		t.Fatalf("catalog = %d entries, want 11", len(subs))
	}
	sess, _, err := s.ListSessions(1, SessionFilter{})
	if err != nil {
		t.Fatalf("list sessions: %v", err)
	}
	if len(sess) != 1 || sess[0].SubjectName != "other" || sess[0].SubjectIcon != "brain" {
		t.Fatalf("sessions = %+v, want legacy subject mapped to other", sess)
	}
}
