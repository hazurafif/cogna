package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func doJSON(t *testing.T, ts *httptest.Server, method, path, token, body string) (*http.Response, map[string]any) {
	t.Helper()
	var reader io.Reader
	if body == "" {
		reader = bytes.NewReader(nil)
	} else {
		reader = bytes.NewBufferString(body)
	}
	req, err := http.NewRequest(method, ts.URL+path, reader)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode %s %s: %v", method, path, err)
	}
	return resp, out
}

func TestGetSettingsDefaults(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "gs@example.com", "password123")

	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/settings", token, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if out["daily_goal_minutes"] != float64(120) || out["weekly_goal_minutes"] != float64(840) {
		t.Fatalf("got %+v, want defaults 120/840", out)
	}
}

func TestUpdateSettings(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "us@example.com", "password123")

	resp, out := doJSON(t, ts, http.MethodPut, "/api/v1/settings", token,
		`{"daily_goal_minutes":90,"weekly_goal_minutes":600,"reminder_enabled":true,"reminder_time":"20:00"}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if out["daily_goal_minutes"] != float64(90) || out["weekly_goal_minutes"] != float64(600) {
		t.Fatalf("got %+v", out)
	}
	if out["reminder_enabled"] != true || out["reminder_time"] != "20:00" {
		t.Fatalf("reminder = %+v", out)
	}

	_, out = doJSON(t, ts, http.MethodGet, "/api/v1/settings", token, "")
	if out["daily_goal_minutes"] != float64(90) || out["reminder_time"] != "20:00" {
		t.Fatalf("persisted? got %+v", out)
	}
}

func TestUpdateSettingsRejectsOutOfRange(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "bad@example.com", "password123")

	for _, body := range []string{
		`{"daily_goal_minutes":5,"weekly_goal_minutes":840,"reminder_time":"19:00"}`,
		`{"daily_goal_minutes":900,"weekly_goal_minutes":840,"reminder_time":"19:00"}`,
		`{"daily_goal_minutes":120,"weekly_goal_minutes":30,"reminder_time":"19:00"}`,
		`{"daily_goal_minutes":120,"weekly_goal_minutes":5000,"reminder_time":"19:00"}`,
		`{"daily_goal_minutes":120,"reminder_time":"19:00"}`,
		`{"daily_goal_minutes":120,"weekly_goal_minutes":840,"reminder_time":"25:00"}`,
		`{"daily_goal_minutes":120,"weekly_goal_minutes":840,"reminder_time":"7pm"}`,
		`{"daily_goal_minutes":120,"weekly_goal_minutes":840,"reminder_time":""}`,
	} {
		resp, _ := doJSON(t, ts, http.MethodPut, "/api/v1/settings", token, body)
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("body %s: status = %d, want 400", body, resp.StatusCode)
		}
	}
}

func TestSettingsRequireAuth(t *testing.T) {
	ts := newTestServer(t)

	for _, method := range []string{http.MethodGet, http.MethodPut} {
		req, _ := http.NewRequest(method, ts.URL+"/api/v1/settings", bytes.NewReader(nil))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", method, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("%s: status = %d, want 401", method, resp.StatusCode)
		}
	}
}
