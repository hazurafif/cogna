package auth

import "testing"

func TestIssueAndParseToken(t *testing.T) {
	const secret = "test-secret"
	token, err := IssueToken(secret, 42)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.UserID != 42 {
		t.Fatalf("user id = %d, want 42", claims.UserID)
	}
}

func TestParseTokenRejectsBadSecret(t *testing.T) {
	token, err := IssueToken("secret-a", 1)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, err := ParseToken("secret-b", token); err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestParseTokenRejectsGarbage(t *testing.T) {
	if _, err := ParseToken("secret", "not-a-token"); err == nil {
		t.Fatal("expected error for garbage token")
	}
}
