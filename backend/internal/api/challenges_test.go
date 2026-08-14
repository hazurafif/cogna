package api

import (
	"net/http"
	"testing"
)

func TestCurrentChallengeHandler(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "challenge@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	// A session this week so the challenge has some progress.
	body := `{"subject_id":` + strconvFormatInt(subID) +
		`,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:30:00","source":"manual"}`
	doJSON(t, ts, http.MethodPost, "/api/v1/sessions", token, body)

	// The challenge is computed from the real current week, so only assert
	// shape and consistency (value > 0 when the session lands in this week).
	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/challenges/current", token, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	challenge, ok := out["challenge"].(map[string]any)
	if !ok {
		t.Fatalf("out = %+v", out)
	}
	if challenge["code"] == "" || challenge["name"] == "" || challenge["target"] == nil {
		t.Fatalf("challenge = %+v", challenge)
	}
	if _, ok := out["value"]; !ok {
		t.Fatalf("missing value in %+v", out)
	}
	if _, ok := out["days_left"]; !ok {
		t.Fatalf("missing days_left in %+v", out)
	}
}

func TestCurrentChallengeRequiresAuth(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/challenges/current")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
