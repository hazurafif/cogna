package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestAchievementsListAndUnlockOnCreate(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "badges@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/achievements", token, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	items, ok := out["achievements"].([]any)
	if !ok || len(items) != 10 {
		t.Fatalf("got %+v, want 10 achievements", out["achievements"])
	}
	first := items[0].(map[string]any)
	if first["unlocked"] != false || first["code"] != "first_session" {
		t.Fatalf("first = %+v", first)
	}

	// Creating a session unlocks first_session and reports it.
	body := `{"subject_id":` + strconvFormatInt(subID) +
		`,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:00:00","source":"manual"}`
	resp, out = doJSON(t, ts, http.MethodPost, "/api/v1/sessions", token, body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
	newly, ok := out["new_achievements"].([]any)
	if !ok || len(newly) != 1 {
		t.Fatalf("new_achievements = %+v, want exactly one", out["new_achievements"])
	}
	badge := newly[0].(map[string]any)
	if badge["code"] != "first_session" || badge["name"] == "" {
		t.Fatalf("badge = %+v", badge)
	}

	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/achievements", token, "")
	items = out["achievements"].([]any)
	unlocked := 0
	for _, it := range items {
		if it.(map[string]any)["unlocked"] == true {
			unlocked++
		}
	}
	if unlocked != 1 {
		t.Fatalf("unlocked = %d, want 1", unlocked)
	}
}

func TestAchievementsDoNotUnlockTwice(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "once@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	for i := 0; i < 2; i++ {
		body := `{"subject_id":` + strconvFormatInt(subID) +
			`,"started_at":"2026-07-3` + string(rune('0'+i)) + `T09:00:00","ended_at":"2026-07-3` + string(rune('0'+i)) + `T10:00:00","source":"manual"}`
		resp, out := doJSON(t, ts, http.MethodPost, "/api/v1/sessions", token, body)
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("create %d: status %d", i, resp.StatusCode)
		}
		newly, _ := out["new_achievements"].([]any)
		if i == 0 && len(newly) != 1 {
			t.Fatalf("first create newly = %+v, want one", newly)
		}
		if i == 1 && len(newly) != 0 {
			t.Fatalf("second create newly = %+v, want none", newly)
		}
	}
}

func TestAchievementsRequireAuth(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/achievements")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

var _ = json.Valid // keep encoding/json imported for future response checks
