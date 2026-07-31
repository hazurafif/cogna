package main

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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

func TestLoadDotEnv(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := "PORT=9999\nJWT_SECRET=abcdefghijklmnopqrstuvwxyz123456\n"
	if err := os.WriteFile(envPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write env: %v", err)
	}

	t.Setenv("PORT", "1234")

	if err := loadDotEnv(envPath); err != nil {
		t.Fatalf("loadDotEnv: %v", err)
	}
	if got := os.Getenv("JWT_SECRET"); got != "abcdefghijklmnopqrstuvwxyz123456" {
		t.Fatalf("JWT_SECRET = %q, want value from .env", got)
	}
	if got := os.Getenv("PORT"); got != "1234" {
		t.Fatalf("PORT = %q, want 1234 (existing env vars must win)", got)
	}
}

func TestLoadDotEnvMissingIsIgnorable(t *testing.T) {
	dir := t.TempDir()
	err := loadDotEnv(filepath.Join(dir, "missing.env"))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("err = %v, want fs.ErrNotExist (or nil)", err)
	}
}
