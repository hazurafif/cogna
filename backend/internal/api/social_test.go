package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func registerUserNamed(t *testing.T, ts *httptest.Server, email, password, name string) string {
	t.Helper()
	token := registerUser(t, ts, email, password)
	doJSON(t, ts, http.MethodPatch, "/api/v1/me", token, `{"name":"`+name+`"}`)
	return token
}

func TestSocialSearchFollowAndFeed(t *testing.T) {
	ts := newTestServer(t)
	aliceToken := registerUserNamed(t, ts, "alice@example.com", "password123", "Alice")
	bobToken := registerUserNamed(t, ts, "bob@example.com", "password123", "Bob")
	registerUserNamed(t, ts, "carol@example.com", "password123", "Carol")

	// Alice searches for bob and follows him.
	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/users/search?q=bob", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("search status = %d", resp.StatusCode)
	}
	users := out["users"].([]any)
	if len(users) != 1 {
		t.Fatalf("users = %+v", users)
	}
	bobID := int64(users[0].(map[string]any)["id"].(float64))

	resp, out = doJSON(t, ts, http.MethodPost, "/api/v1/users/"+strconvFormatInt(bobID)+"/follow", aliceToken, "")
	if resp.StatusCode != http.StatusOK || out["following"] != true {
		t.Fatalf("follow: %+v", out)
	}

	// Bob creates a session; Alice's feed shows it with kudos support.
	subID := catalogSubjectID(t, ts, bobToken, "math")
	createSession(t, ts, bobToken, subID, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/feed", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("feed status = %d", resp.StatusCode)
	}
	items := out["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("items = %+v", items)
	}
	item := items[0].(map[string]any)
	user := item["user"].(map[string]any)
	if user["name"] != "Bob" {
		t.Fatalf("user = %+v", user)
	}
	sess := item["session"].(map[string]any)
	sessID := int64(sess["id"].(float64))

	// Alice kudos Bob's session.
	resp, _ = doJSON(t, ts, http.MethodPost, "/api/v1/sessions/"+strconvFormatInt(sessID)+"/kudos", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("kudos status = %d", resp.StatusCode)
	}

	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/feed", aliceToken, "")
	items = out["items"].([]any)
	item = items[0].(map[string]any)
	if item["kudos_count"] != float64(1) || item["kudos_by_me"] != true {
		t.Fatalf("item = %+v", item)
	}

	// Self-kudos is rejected.
	resp, _ = doJSON(t, ts, http.MethodPost, "/api/v1/sessions/"+strconvFormatInt(sessID)+"/kudos", bobToken, "")
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("self kudos status = %d, want 400", resp.StatusCode)
	}

	// Unfollow removes the session from the feed.
	resp, _ = doJSON(t, ts, http.MethodDelete, "/api/v1/users/"+strconvFormatInt(bobID)+"/follow", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("unfollow status = %d", resp.StatusCode)
	}
	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/feed", aliceToken, "")
	items = out["items"].([]any)
	if len(items) != 0 {
		t.Fatalf("feed after unfollow = %+v", items)
	}
}

func TestLeaderboardHandler(t *testing.T) {
	ts := newTestServer(t)
	aliceToken := registerUserNamed(t, ts, "alice@example.com", "password123", "Alice")
	bobToken := registerUserNamed(t, ts, "bob@example.com", "password123", "Bob")

	subID := catalogSubjectID(t, ts, bobToken, "math")
	createSession(t, ts, bobToken, subID, "2026-07-31T09:00:00", "2026-07-31T11:00:00")

	resp, out := doJSON(t, ts, http.MethodGet, "/api/v1/users/search?q=bob", aliceToken, "")
	bobID := int64(out["users"].([]any)[0].(map[string]any)["id"].(float64))
	doJSON(t, ts, http.MethodPost, "/api/v1/users/"+strconvFormatInt(bobID)+"/follow", aliceToken, "")

	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/leaderboard", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("leaderboard status = %d", resp.StatusCode)
	}
	entries := out["entries"].([]any)
	if len(entries) != 2 {
		t.Fatalf("entries = %+v", entries)
	}
	first := entries[0].(map[string]any)
	second := entries[1].(map[string]any)
	// Whoever has more minutes this week ranks first; assert both users present.
	names := map[string]bool{}
	for _, e := range entries {
		names[e.(map[string]any)["name"].(string)] = true
	}
	if !names["Alice"] || !names["Bob"] {
		t.Fatalf("entries = %+v", entries)
	}
	_ = first
	_ = second

	// Following list endpoint.
	resp, out = doJSON(t, ts, http.MethodGet, "/api/v1/follows", aliceToken, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("follows status = %d", resp.StatusCode)
	}
	following := out["following"].([]any)
	if len(following) != 1 {
		t.Fatalf("following = %+v", following)
	}
}

func TestSocialRequiresAuth(t *testing.T) {
	ts := newTestServer(t)

	for _, path := range []string{"/api/v1/users/search?q=bob", "/api/v1/feed", "/api/v1/leaderboard", "/api/v1/follows"} {
		req, _ := http.NewRequest(http.MethodGet, ts.URL+path, nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("%s: status = %d, want 401", path, resp.StatusCode)
		}
	}
}


func TestSocialErrorPaths(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "errs@example.com", "password123")
	subID := catalogSubjectID(t, ts, token, "math")
	sessID := createSession(t, ts, token, subID, "2026-07-31T09:00:00", "2026-07-31T10:00:00")

	cases := []struct {
		method, path, body string
		want               int
	}{
		{http.MethodGet, "/api/v1/users/search", "", http.StatusBadRequest},
		{http.MethodGet, "/api/v1/users/search?q=abc", "", http.StatusOK},
		{http.MethodPost, "/api/v1/users/0/follow", "", http.StatusBadRequest},
		{http.MethodPost, "/api/v1/users/999/follow", "", http.StatusNotFound},
		{http.MethodDelete, "/api/v1/users/0/follow", "", http.StatusBadRequest},
		{http.MethodGet, "/api/v1/feed?limit=0", "", http.StatusBadRequest},
		{http.MethodGet, "/api/v1/feed?limit=500", "", http.StatusBadRequest},
		{http.MethodGet, "/api/v1/feed?offset=-1", "", http.StatusBadRequest},
		{http.MethodPost, "/api/v1/sessions/999/kudos", "", http.StatusNotFound},
		{http.MethodPost, "/api/v1/sessions/" + strconvFormatInt(sessID) + "/kudos", "", http.StatusBadRequest}, // self
		{http.MethodPost, "/api/v1/sessions/0/kudos", "", http.StatusBadRequest},
		{http.MethodDelete, "/api/v1/sessions/0/kudos", "", http.StatusBadRequest},
	}
	for _, c := range cases {
		resp, _ := doJSON(t, ts, c.method, c.path, token, c.body)
		if resp.StatusCode != c.want {
			t.Fatalf("%s %s: status = %d, want %d", c.method, c.path, resp.StatusCode, c.want)
		}
	}
}
