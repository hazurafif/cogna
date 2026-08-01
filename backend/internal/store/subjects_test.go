package store

import (
	"errors"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func mustUser(t *testing.T, s *Store, email string) int64 {
	t.Helper()
	u, err := s.CreateUser(email, "hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return u.ID
}

func TestCreateAndListSubjects(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "sub@example.com")

	got, err := s.CreateSubject(userID, "Math", "book-open")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if got.Name != "Math" || got.Icon != "book-open" {
		t.Fatalf("got %+v", got)
	}
	if got.ID == 0 {
		t.Fatal("expected non-zero id")
	}

	subs, err := s.ListSubjects(userID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(subs) != 1 || subs[0].Name != "Math" {
		t.Fatalf("got %+v", subs)
	}
}

func TestListSubjectsScopedToUser(t *testing.T) {
	s := newTestStore(t)
	userA := mustUser(t, s, "a@example.com")
	userB := mustUser(t, s, "b@example.com")

	if _, err := s.CreateSubject(userA, "A-only", "calculator"); err != nil {
		t.Fatalf("create: %v", err)
	}

	subs, err := s.ListSubjects(userB)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(subs) != 0 {
		t.Fatalf("user B sees %d subjects, want 0", len(subs))
	}
}

func TestUpdateSubject(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "up@example.com")

	sub, err := s.CreateSubject(userID, "Old", "book-open")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	got, err := s.UpdateSubject(userID, sub.ID, "New", "atom")
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.Name != "New" || got.Icon != "atom" {
		t.Fatalf("got %+v", got)
	}

	if _, err := s.UpdateSubject(userID+1, sub.ID, "X", "atom"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other user's subject: err = %v, want ErrNotFound", err)
	}
}

func TestDeleteSubject(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "del@example.com")

	sub, err := s.CreateSubject(userID, "Doomed", "book-open")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := s.DeleteSubject(userID, sub.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.DeleteSubject(userID, sub.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second delete: err = %v, want ErrNotFound", err)
	}
}

func TestDeleteSubjectInUse(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "busy@example.com")

	sub, err := s.CreateSubject(userID, "Busy", "book-open")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub.ID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); err != nil {
		t.Fatalf("create session: %v", err)
	}

	if err := s.DeleteSubject(userID, sub.ID); !errors.Is(err, ErrSubjectInUse) {
		t.Fatalf("err = %v, want ErrSubjectInUse", err)
	}
}
