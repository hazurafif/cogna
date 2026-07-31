package auth

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if hash == "correct horse battery staple" {
		t.Fatal("hash must not equal plaintext")
	}
	if !VerifyPassword(hash, "correct horse battery staple") {
		t.Fatal("correct password should verify")
	}
	if VerifyPassword(hash, "wrong password") {
		t.Fatal("wrong password must not verify")
	}
}
