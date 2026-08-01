package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func createSubject(t *testing.T, ts *httptest.Server, token, name, icon string) int64 {
	t.Helper()
	body := bytes.NewBufferString(`{"name":"` + name + `","icon":"` + icon + `"}`)
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

	id := createSubject(t, ts, token, "Math", "book-open")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/subjects", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	defer resp.Body.Close()
	var subs []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&subs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(subs) != 1 || subs[0].ID != id || subs[0].Name != "Math" || subs[0].Icon != "book-open" {
		t.Fatalf("got %+v", subs)
	}

	req, _ = http.NewRequest(http.MethodPut, ts.URL+"/api/v1/subjects/"+strconvFormatInt(id),
		strings.NewReader(`{"name":"Calculus","icon":"calculator"}`))
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
		`{"name":"","icon":"book-open"}`,
		`{"name":"Math","icon":"NOT-VALID!"}`,
		`{"name":"Math","icon":""}`,
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

	id := createSubject(t, ts, tokenA, "Mine", "book-open")

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/v1/subjects/"+strconvFormatInt(id),
		strings.NewReader(`{"name":"Hacked","icon":"book-open"}`))
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
