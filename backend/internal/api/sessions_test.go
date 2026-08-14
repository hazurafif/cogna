package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"cogna/backend/internal/auth"
	"cogna/backend/internal/store"
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
		Session struct {
			ID int64 `json:"id"`
		} `json:"session"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Session.ID == 0 {
		t.Fatal("create returned no session id")
	}
	return out.Session.ID
}

func TestSessionLifecycle(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "life@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

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
	if sess.DurationMinutes != 75 || sess.SubjectName != "math" {
		t.Fatalf("got %+v", sess)
	}

	req, _ = http.NewRequest(http.MethodPut, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id),
		strings.NewReader(`{"subject_id":`+strconvFormatInt(subID)+`,"started_at":"2026-07-31T08:00:00","ended_at":"2026-07-31T09:30:00","source":"timer","note":"deep work"}`))
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
	subID := catalogSubjectID(t, ts, token, "math")

	for _, payload := range []string{
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T10:00:00","ended_at":"2026-07-31T09:00:00","source":"manual"}`,
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"not-a-time","ended_at":"2026-07-31T10:00:00","source":"manual"}`,
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"automatic"}`,
		`{"subject_id":0,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`,
		`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual","note":"` + strings.Repeat("x", 501) + `"}`,
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

func TestCreateSessionAcceptsRFC3339(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "rfc@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	id := createSession(t, ts, token, subID, "2026-07-31T09:00:00Z", "2026-07-31T10:30:00Z")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	var sess struct {
		DurationMinutes int64  `json:"duration_minutes"`
		StartedAt       string `json:"started_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sess); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if sess.DurationMinutes != 90 || sess.StartedAt != "2026-07-31T09:00:00" {
		t.Fatalf("got %+v", sess)
	}
}

func TestCreateSessionRejectsUnknownSubject(t *testing.T) {
	ts := newTestServer(t)
	tokenB := registerUser(t, ts, "ss-b@example.com", "password123")

	body := bytes.NewBufferString(`{"subject_id":9999,
		"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`)
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

func TestCreateSessionAcceptsAnyCatalogSubject(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "cat@example.com", "password123")
	otherID := catalogSubjectID(t, ts, token, "other")

	id := createSession(t, ts, token, otherID, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	var sess struct {
		SubjectName string `json:"subject_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sess); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if sess.SubjectName != "other" {
		t.Fatalf("subject = %q, want other", sess.SubjectName)
	}
}

func TestListSessionsHandler(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "ls@example.com", "password123")
	subA := catalogSubjectID(t, ts, token, "math")
	subB := catalogSubjectID(t, ts, token, "history")
	createSession(t, ts, token, subA, "2026-07-30T09:00:00", "2026-07-30T10:00:00")
	createSession(t, ts, token, subB, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	list := func(query string) []struct {
		ID          int64  `json:"id"`
		SubjectID   int64  `json:"subject_id"`
		SubjectName string `json:"subject_name"`
	} {
		t.Helper()
		req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/sessions"+query, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("list: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status = %d, want 200", resp.StatusCode)
		}
		var out struct {
			Sessions []struct {
				ID          int64  `json:"id"`
				SubjectID   int64  `json:"subject_id"`
				SubjectName string `json:"subject_name"`
			} `json:"sessions"`
			Total int `json:"total"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if out.Total != len(out.Sessions) {
			t.Fatalf("total = %d, want %d", out.Total, len(out.Sessions))
		}
		return out.Sessions
	}

	all := list("")
	if len(all) != 2 || all[0].SubjectName != "history" || all[1].SubjectName != "math" {
		t.Fatalf("all: got %+v, want newest first", all)
	}
	day := list("?from=2026-07-31&to=2026-07-31")
	if len(day) != 1 || day[0].SubjectName != "history" {
		t.Fatalf("day: got %+v", day)
	}
	only := list("?subject_id=" + strconvFormatInt(subA))
	if len(only) != 1 || only[0].SubjectID != subA {
		t.Fatalf("subject filter: got %+v", only)
	}
}

func TestListSessionsRejectsBadSubjectID(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "lsb@example.com", "password123")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/sessions?subject_id=abc", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestSessionNotFound(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "nf@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		var body io.Reader
		if method == http.MethodPut {
			body = strings.NewReader(`{"subject_id":` + strconvFormatInt(subID) + `,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`)
		}
		req, _ := http.NewRequest(method, ts.URL+"/api/v1/sessions/999", body)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", method, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("%s: status = %d, want 404", method, resp.StatusCode)
		}
	}
}

func TestSessionsInternalErrors(t *testing.T) {
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	ts := httptest.NewServer(NewRouter(st, "test-secret"))
	defer ts.Close()

	token, err := auth.IssueToken("test-secret", 1)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	st.Close()

	for _, path := range []string{"/api/v1/sessions", "/api/v1/sessions/1"} {
		req, _ := http.NewRequest(http.MethodGet, ts.URL+path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("get %s: %v", path, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusInternalServerError {
			t.Fatalf("get %s: status = %d, want 500", path, resp.StatusCode)
		}
	}

	req, _ := http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/sessions/1", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("delete: status = %d, want 500", resp.StatusCode)
	}
}

func TestCreateSessionInternalError(t *testing.T) {
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	ts := httptest.NewServer(NewRouter(st, "test-secret"))
	defer ts.Close()

	token := registerUser(t, ts, "cerr@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	st.Close()

	body := bytes.NewBufferString(`{"subject_id":` + strconvFormatInt(subID) +
		`,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/sessions", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
}

func TestUpdateSessionInternalError(t *testing.T) {
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	ts := httptest.NewServer(NewRouter(st, "test-secret"))
	defer ts.Close()

	token := registerUser(t, ts, "uerr@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")
	id := createSession(t, ts, token, subID, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	st.Close()

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id),
		strings.NewReader(`{"subject_id":`+strconvFormatInt(subID)+`,"started_at":"2026-07-31T08:00:00","ended_at":"2026-07-31T09:00:00","source":"manual"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
}

func TestCreateSessionRejectsOffsetMismatch(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "off@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/sessions",
		strings.NewReader(`{"subject_id":`+strconvFormatInt(subID)+`,"started_at":"2026-07-31T08:00:00Z","ended_at":"2026-07-31T09:00:00+02:00","source":"manual"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Error.Code != "invalid_range" {
		t.Fatalf("error code = %q, want invalid_range", body.Error.Code)
	}
}

func TestUpdateSessionRejectsUnknownSubject(t *testing.T) {
	ts := newTestServer(t)
	tokenB := registerUser(t, ts, "updsub-b@example.com", "password123")
	subB := catalogSubjectID(t, ts, tokenB, "math")
	id := createSession(t, ts, tokenB, subB, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	req, _ := http.NewRequest(http.MethodPut, ts.URL+"/api/v1/sessions/"+strconvFormatInt(id),
		strings.NewReader(`{"subject_id":9999,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`))
	req.Header.Set("Authorization", "Bearer "+tokenB)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Error.Code != "invalid_subject" {
		t.Fatalf("error code = %q, want invalid_subject", body.Error.Code)
	}
}
