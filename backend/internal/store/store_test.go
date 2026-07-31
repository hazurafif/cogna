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
	if n != 1 {
		t.Fatalf("migrations recorded = %d, want 1", n)
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
