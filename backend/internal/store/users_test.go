package store

import (
	"errors"
	"testing"
)

func TestCreateUserAndFetchByEmail(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	user, err := s.CreateUser("student@example.com", "$2a$10$hash")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if user.ID == 0 {
		t.Fatal("user id not assigned")
	}
	if user.Email != "student@example.com" {
		t.Fatalf("email = %q, want student@example.com", user.Email)
	}
	if user.CreatedAt == "" {
		t.Fatal("created_at not set")
	}

	got, err := s.UserByEmail("student@example.com")
	if err != nil {
		t.Fatalf("by email: %v", err)
	}
	if got.ID != user.ID || got.PasswordHash != "$2a$10$hash" || got.CreatedAt != user.CreatedAt {
		t.Fatalf("round trip mismatch: %+v vs %+v", got, user)
	}

	byID, err := s.UserByID(user.ID)
	if err != nil {
		t.Fatalf("by id: %v", err)
	}
	if byID.Email != user.Email {
		t.Fatalf("by id email = %q, want %q", byID.Email, user.Email)
	}
}

func TestCreateUserRejectsDuplicateEmail(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	if _, err := s.CreateUser("dup@example.com", "hash-a"); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateUser("dup@example.com", "hash-b"); !errors.Is(err, ErrDuplicateEmail) {
		t.Fatalf("err = %v, want ErrDuplicateEmail", err)
	}
}

func TestUserByEmailNotFound(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	if _, err := s.UserByEmail("nobody@example.com"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
}

func TestUserByIDNotFound(t *testing.T) {
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer s.Close()

	if _, err := s.UserByID(999); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
}
