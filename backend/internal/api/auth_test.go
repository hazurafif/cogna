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

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	ts := httptest.NewServer(NewRouter(st, "test-secret"))
	t.Cleanup(ts.Close)
	return ts
}

func registerUser(t *testing.T, ts *httptest.Server, email, password string) string {
	t.Helper()
	body := bytes.NewBufferString(`{"email":"` + email + `","password":"` + password + `"}`)
	resp, err := http.Post(ts.URL+"/api/v1/auth/register", "application/json", body)
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status = %d", resp.StatusCode)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Token == "" {
		t.Fatal("register returned empty token")
	}
	return out.Token
}

func TestRegisterAndLogin(t *testing.T) {
	ts := newTestServer(t)

	registerUser(t, ts, "student@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/login",
		"application/json",
		strings.NewReader(`{"email":"student@example.com","password":"password123"}`))
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login status = %d", resp.StatusCode)
	}
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	ts := newTestServer(t)
	registerUser(t, ts, "dup@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"dup@example.com","password":"password123"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d, want 409", resp.StatusCode)
	}
}

func TestRegisterRejectsWeakPassword(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"weak@example.com","password":"short"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestRegisterRejectsInvalidEmail(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"not-an-email","password":"password123"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestRegisterRejectsInvalidJSON(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestRegisterRejectsOversizedPassword(t *testing.T) {
	ts := newTestServer(t)

	long := strings.Repeat("a", 73)
	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"long@example.com","password":"`+long+`"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
	var out struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Error.Code != "invalid_password" {
		t.Fatalf("code = %q, want invalid_password", out.Error.Code)
	}
}

func TestRegisterAcceptsMaxLengthPassword(t *testing.T) {
	ts := newTestServer(t)

	long := strings.Repeat("a", 72)
	resp, err := http.Post(ts.URL+"/api/v1/auth/register",
		"application/json",
		strings.NewReader(`{"email":"boundary@example.com","password":"`+long+`"}`))
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}
}

func TestLoginRejectsWrongPassword(t *testing.T) {
	ts := newTestServer(t)
	registerUser(t, ts, "user@example.com", "password123")

	resp, err := http.Post(ts.URL+"/api/v1/auth/login",
		"application/json",
		strings.NewReader(`{"email":"user@example.com","password":"nope"}`))
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func loginAttempt(t *testing.T, ts *httptest.Server, email, password string) (int, string) {
	t.Helper()
	resp, err := http.Post(ts.URL+"/api/v1/auth/login",
		"application/json",
		strings.NewReader(`{"email":"`+email+`","password":"`+password+`"}`))
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp.StatusCode, string(body)
}

func TestLoginUnknownEmailMatchesWrongPassword(t *testing.T) {
	ts := newTestServer(t)
	registerUser(t, ts, "known@example.com", "password123")

	wantStatus, wantBody := loginAttempt(t, ts, "known@example.com", "wrong-pass")
	gotStatus, gotBody := loginAttempt(t, ts, "unknown@example.com", "wrong-pass")

	if gotStatus != wantStatus || gotBody != wantBody {
		t.Fatalf("unknown email login = %d %q, want %d %q (identical to wrong-password login)",
			gotStatus, gotBody, wantStatus, wantBody)
	}
	if gotStatus != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", gotStatus)
	}
}

func TestMeRequiresToken(t *testing.T) {
	ts := newTestServer(t)

	resp, err := http.Get(ts.URL + "/api/v1/me")
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestMeRejectsInvalidToken(t *testing.T) {
	ts := newTestServer(t)

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-token")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestMeRejectsUnknownUser(t *testing.T) {
	ts := newTestServer(t)

	token, err := auth.IssueToken("test-secret", 999)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestMeReturnsInternalErrorOnStoreFailure(t *testing.T) {
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

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
}

func TestMeReturnsUser(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "me@example.com", "password123")

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var out struct {
		User struct {
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.User.Email != "me@example.com" {
		t.Fatalf("email = %q, want me@example.com", out.User.Email)
	}
}

func TestUpdateMeSetsName(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "name@example.com", "password123")

	resp, out := doJSON(t, ts, http.MethodPatch, "/api/v1/me", token, `{"name":"  Rina  "}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	user, ok := out["user"].(map[string]any)
	if !ok {
		t.Fatalf("out = %+v", out)
	}
	if user["name"] != "Rina" {
		t.Fatalf("name = %v, want trimmed Rina", user["name"])
	}
	if user["email"] != "name@example.com" {
		t.Fatalf("email = %v", user["email"])
	}
}

func TestUpdateMeRejectsInvalidNames(t *testing.T) {
	ts := newTestServer(t)
	token := registerUser(t, ts, "badname@example.com", "password123")

	for _, body := range []string{
		`{}`,
		`{"name":""}`,
		`{"name":"   "}`,
		`{"name":"` + strings.Repeat("x", 51) + `"}`,
	} {
		resp, _ := doJSON(t, ts, http.MethodPatch, "/api/v1/me", token, body)
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("body %s: status = %d, want 400", body, resp.StatusCode)
		}
	}
}

func TestUpdateMeRequiresToken(t *testing.T) {
	ts := newTestServer(t)

	resp, _ := doJSON(t, ts, http.MethodPatch, "/api/v1/me", "", `{"name":"Rina"}`)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
