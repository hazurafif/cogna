package store

import (
	"errors"
	"testing"
)

func TestCreateAndGetSession(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "sess@example.com")
	subjectID := mustCatalogSubject(t, s, "math")

	sess, err := s.CreateSession(userID, subjectID, "2026-07-31T09:00:00", "2026-07-31T10:30:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if sess.DurationMinutes != 90 {
		t.Fatalf("duration = %d, want 90", sess.DurationMinutes)
	}
	if sess.Source != "timer" {
		t.Fatalf("source = %q, want timer", sess.Source)
	}

	got, err := s.SessionByID(userID, sess.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.SubjectID != subjectID || got.SubjectName != "math" {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateSessionValidatesSubjectExists(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "own@example.com")

	if _, err := s.CreateSession(userID, 9999, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); !errors.Is(err, ErrSubjectNotFound) {
		t.Fatalf("err = %v, want ErrSubjectNotFound", err)
	}
}

func TestCreateSessionAcceptsAnyCatalogSubject(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "cat@example.com")
	otherID := mustCatalogSubject(t, s, "other")

	if _, err := s.CreateSession(userID, otherID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	got, _, err := s.ListSessions(userID, SessionFilter{})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(got) != 1 || got[0].SubjectID != otherID || got[0].SubjectName != "other" {
		t.Fatalf("got %+v", got)
	}
}

func TestListSessionsFilters(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "list@example.com")
	subA := mustCatalogSubject(t, s, "math")
	subB := mustCatalogSubject(t, s, "history")

	if _, err := s.CreateSession(userID, subA, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, subB, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "manual", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	all, _, err := s.ListSessions(userID, SessionFilter{})
	if err != nil {
		t.Fatalf("list all: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("got %d sessions, want 2", len(all))
	}
	if all[0].StartedAt < all[1].StartedAt {
		t.Fatal("expected newest first")
	}

	day, _, err := s.ListSessions(userID, SessionFilter{From: "2026-07-31", To: "2026-07-31"})
	if err != nil {
		t.Fatalf("list day: %v", err)
	}
	if len(day) != 1 || day[0].SubjectID != subB {
		t.Fatalf("got %+v", day)
	}

	only, _, err := s.ListSessions(userID, SessionFilter{SubjectID: subA})
	if err != nil {
		t.Fatalf("list by subject: %v", err)
	}
	if len(only) != 1 || only[0].SubjectID != subA {
		t.Fatalf("got %+v", only)
	}
}

func TestListSessionsSearchAndPagination(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "page@example.com")
	mathID := mustCatalogSubject(t, s, "math")
	histID := mustCatalogSubject(t, s, "history")

	note := func(s string) *string { return &s }
	for i, started := range []string{
		"2026-07-27T09:00:00",
		"2026-07-28T09:00:00",
		"2026-07-29T09:00:00",
		"2026-07-30T09:00:00",
	} {
		var subject int64
		var n *string
		if i%2 == 0 {
			subject = mathID
			n = note("algebra review")
		} else {
			subject = histID
			n = note("world war one notes")
		}
		if _, err := s.CreateSession(userID, subject, started, started[:11]+"10:00:00", "timer", n); err != nil {
			t.Fatalf("create %d: %v", i, err)
		}
	}

	all, total, err := s.ListSessions(userID, SessionFilter{})
	if err != nil {
		t.Fatalf("list all: %v", err)
	}
	if len(all) != 4 || total != 4 {
		t.Fatalf("got %d sessions total %d, want 4/4", len(all), total)
	}

	page, total, err := s.ListSessions(userID, SessionFilter{Limit: 2, Offset: 1})
	if err != nil {
		t.Fatalf("list page: %v", err)
	}
	if len(page) != 2 || total != 4 {
		t.Fatalf("got %d sessions total %d, want 2/4", len(page), total)
	}
	if page[0].StartedAt != "2026-07-29T09:00:00" || page[1].StartedAt != "2026-07-28T09:00:00" {
		t.Fatalf("page order = %+v", page)
	}

	byNote, total, err := s.ListSessions(userID, SessionFilter{Q: "algebra"})
	if err != nil {
		t.Fatalf("search note: %v", err)
	}
	if len(byNote) != 2 || total != 2 {
		t.Fatalf("note search got %d total %d, want 2/2", len(byNote), total)
	}

	bySubject, _, err := s.ListSessions(userID, SessionFilter{Q: "history"})
	if err != nil {
		t.Fatalf("search subject: %v", err)
	}
	if len(bySubject) != 2 {
		t.Fatalf("subject search got %d, want 2", len(bySubject))
	}

	noMatch, total, err := s.ListSessions(userID, SessionFilter{Q: "zzz"})
	if err != nil {
		t.Fatalf("search miss: %v", err)
	}
	if len(noMatch) != 0 || total != 0 {
		t.Fatalf("miss got %d total %d, want 0/0", len(noMatch), total)
	}
}

func TestUpdateAndDeleteSession(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "upd@example.com")
	subA := mustCatalogSubject(t, s, "math")
	subB := mustCatalogSubject(t, s, "history")

	sess, err := s.CreateSession(userID, subA, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	note := "final review"
	got, err := s.UpdateSession(userID, sess.ID, subB, "2026-07-31T08:00:00", "2026-07-31T09:30:00", &note)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.SubjectID != subB || got.DurationMinutes != 90 || got.Note == nil || *got.Note != "final review" {
		t.Fatalf("got %+v", got)
	}

	if err := s.DeleteSession(userID, sess.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := s.SessionByID(userID, sess.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
	if err := s.DeleteSession(userID, sess.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("second delete: err = %v, want ErrNotFound", err)
	}
}

func TestUpdateSessionScopingAndErrors(t *testing.T) {
	s := newTestStore(t)
	userA := mustUser(t, s, "upd-a@example.com")
	userB := mustUser(t, s, "upd-b@example.com")
	subA := mustCatalogSubject(t, s, "math")
	subB := mustCatalogSubject(t, s, "history")

	sess, err := s.CreateSession(userA, subA, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if _, err := s.UpdateSession(userB, sess.ID, subB, "2026-07-31T08:00:00", "2026-07-31T09:00:00", nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other user's session: err = %v, want ErrNotFound", err)
	}
	if _, err := s.UpdateSession(userA, sess.ID, 9999, "2026-07-31T08:00:00", "2026-07-31T09:00:00", nil); !errors.Is(err, ErrSubjectNotFound) {
		t.Fatalf("unknown subject: err = %v, want ErrSubjectNotFound", err)
	}
}

func TestDurationMinutesRejectsBadTimes(t *testing.T) {
	if _, err := durationMinutes("garbage", "2026-07-31T10:00:00"); err == nil {
		t.Fatal("expected error for bad started_at")
	}
	if _, err := durationMinutes("2026-07-31T09:00:00", "garbage"); err == nil {
		t.Fatal("expected error for bad ended_at")
	}
}

func TestCreateSessionAcceptsRFC3339(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "rfc3339@example.com")
	subjectID := mustCatalogSubject(t, s, "math")

	sess, err := s.CreateSession(userID, subjectID, "2026-07-31T09:00:00Z", "2026-07-31T10:30:00Z", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if sess.DurationMinutes != 90 {
		t.Fatalf("duration = %d, want 90", sess.DurationMinutes)
	}
	if sess.StartedAt != "2026-07-31T09:00:00" {
		t.Fatalf("started_at = %q, want normalized 2026-07-31T09:00:00", sess.StartedAt)
	}

	got, err := s.SessionByID(userID, sess.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.StartedAt != "2026-07-31T09:00:00" || got.EndedAt != "2026-07-31T10:30:00" {
		t.Fatalf("got %+v", got)
	}
}
