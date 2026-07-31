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
