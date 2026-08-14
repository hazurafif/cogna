package api

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestStatsSummary(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "stat@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	// Dates relative to the real "today" so week/streak assertions hold on any run date
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	createSession(t, ts, token, subID, yesterday+"T09:00:00", yesterday+"T10:00:00")
	createSession(t, ts, token, subID, today+"T09:00:00", today+"T11:00:00")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/stats/summary", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var sum struct {
		TotalMinutes int64 `json:"total_minutes"`
		WeekMinutes  int64 `json:"week_minutes"`
		StreakDays   int   `json:"streak_days"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sum); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if sum.TotalMinutes != 180 {
		t.Fatalf("total = %d, want 180", sum.TotalMinutes)
	}
	if sum.StreakDays != 2 {
		t.Fatalf("streak = %d, want 2", sum.StreakDays)
	}
	// Only assert week >= 120: today's 120 minutes are always in the current
	// week, but yesterday may fall in the previous week on a Monday.
	if sum.WeekMinutes < 120 {
		t.Fatalf("week = %d, want at least 120", sum.WeekMinutes)
	}
}

func TestStatsSummaryRequiresAuth(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/stats/summary")
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestTrendHandler(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "trendapi@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")

	body := `{"subject_id":` + strconvFormatInt(subID) +
		`,"started_at":"2026-07-31T09:00:00","ended_at":"2026-07-31T10:30:00","source":"manual"}`
	doJSON(t, ts, http.MethodPost, "/api/v1/sessions", token, body)

	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/stats/trend?days=7", token, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if out["days"] != float64(7) {
		t.Fatalf("days = %v, want 7", out["days"])
	}
	daily, ok := out["daily"].([]any)
	if !ok || len(daily) != 7 {
		t.Fatalf("daily = %+v", out["daily"])
	}
	if out["total_minutes"] == nil || out["longest_session_minutes"] == nil {
		t.Fatalf("missing insights in %+v", out)
	}
}

func TestTrendHandlerRejectsBadDays(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "trendbad@example.com", "password123")

	for _, days := range []string{"abc", "6", "91", "-1"} {
		resp, _ := doJSON(t, ts, http.MethodGet, "/api/v1/stats/trend?days="+days, token, "")
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("days=%s: status = %d, want 400", days, resp.StatusCode)
		}
	}
}
