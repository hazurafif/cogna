package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type subjectJSON struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

func listSubjects(t *testing.T, ts *httptest.Server, token string) []subjectJSON {
	t.Helper()
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/subjects", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var subs []subjectJSON
	if err := json.NewDecoder(resp.Body).Decode(&subs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return subs
}

func catalogSubjectID(t *testing.T, ts *httptest.Server, token, name string) int64 {
	t.Helper()
	for _, sub := range listSubjects(t, ts, token) {
		if sub.Name == name {
			return sub.ID
		}
	}
	t.Fatalf("catalog has no subject %q", name)
	return 0
}

func TestSubjectCatalog(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "subs@example.com", "password123")

	subs := listSubjects(t, ts, token)
	if len(subs) != 11 {
		t.Fatalf("catalog size = %d, want 11", len(subs))
	}
	names := map[string]bool{}
	for _, sub := range subs {
		names[sub.Name] = true
		if sub.ID == 0 || sub.Icon == "" {
			t.Fatalf("bad entry %+v", sub)
		}
	}
	for _, want := range []string{"math", "science", "language", "programming",
		"reading", "writing", "history", "music", "art", "test-prep", "other"} {
		if !names[want] {
			t.Fatalf("catalog missing %q", want)
		}
	}
}

func TestSubjectCatalogIdenticalForAllUsers(t *testing.T) {
	ts := newTestServer(t)
	tokenA := registerUser(t, ts, "cat-a@example.com", "password123")
	tokenB := registerUser(t, ts, "cat-b@example.com", "password123")

	subsA := listSubjects(t, ts, tokenA)
	subsB := listSubjects(t, ts, tokenB)
	if len(subsA) != len(subsB) {
		t.Fatalf("different catalog sizes: %d vs %d", len(subsA), len(subsB))
	}
	for i := range subsA {
		if subsA[i] != subsB[i] {
			t.Fatalf("catalogs differ at %d: %+v vs %+v", i, subsA[i], subsB[i])
		}
	}
}

func TestSubjectCatalogReadOnly(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "ro@example.com", "password123")
	mathID := catalogSubjectID(t, ts, token, "math")

	requests := []struct {
		name string
		make func() *http.Request
	}{
		{"create", func() *http.Request {
			req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/subjects",
				strings.NewReader(`{"name":"X","icon":"book-open"}`))
			return req
		}},
		{"update", func() *http.Request {
			req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/v1/subjects/"+strconvFormatInt(mathID),
				strings.NewReader(`{"name":"X","icon":"book-open"}`))
			return req
		}},
		{"delete", func() *http.Request {
			req, _ := http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/subjects/"+strconvFormatInt(mathID), nil)
			return req
		}},
	}

	for _, rc := range requests {
		req := rc.make()
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", rc.name, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("%s: status = %d, want 404", rc.name, resp.StatusCode)
		}
	}
}
