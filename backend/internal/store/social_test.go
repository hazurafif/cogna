package store

import (
	"errors"
	"testing"
)

func TestFollowAndFollowing(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")
	bob := mustUser(t, s, "bob@example.com")

	if err := s.Follow(alice, bob); err != nil {
		t.Fatalf("follow: %v", err)
	}
	// Idempotent.
	if err := s.Follow(alice, bob); err != nil {
		t.Fatalf("follow again: %v", err)
	}

	following, err := s.Following(alice, mustParse(t, "2026-07-31T12:00:00"))
	if err != nil {
		t.Fatalf("following: %v", err)
	}
	if len(following) != 1 || following[0].Email != "bob@example.com" || !following[0].IsFollowing {
		t.Fatalf("got %+v", following)
	}

	if err := s.Unfollow(alice, bob); err != nil {
		t.Fatalf("unfollow: %v", err)
	}
	following, err = s.Following(alice, mustParse(t, "2026-07-31T12:00:00"))
	if err != nil {
		t.Fatalf("following after unfollow: %v", err)
	}
	if len(following) != 0 {
		t.Fatalf("got %+v, want none", following)
	}
}

func TestFollowMissingUser(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")

	if err := s.Follow(alice, 999); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("err = %v, want ErrUserNotFound", err)
	}
	if err := s.Follow(alice, alice); err != nil {
		t.Fatalf("self follow should be a no-op, got %v", err)
	}
}

func TestSearchUsers(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")
	mustUser(t, s, "bob@example.com")
	carol := mustUser(t, s, "carol@example.com")

	if err := s.Follow(alice, carol); err != nil {
		t.Fatalf("follow: %v", err)
	}

	results, err := s.SearchUsers(alice, "example")
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2 (self excluded)", len(results))
	}
	byEmail := map[string]UserFollow{}
	for _, u := range results {
		byEmail[u.Email] = u
	}
	if !byEmail["carol@example.com"].IsFollowing {
		t.Fatal("carol should be marked as followed")
	}
	if byEmail["bob@example.com"].IsFollowing {
		t.Fatal("bob should not be marked as followed")
	}

	noMatch, err := s.SearchUsers(alice, "zzz")
	if err != nil {
		t.Fatalf("search miss: %v", err)
	}
	if len(noMatch) != 0 {
		t.Fatalf("got %+v, want none", noMatch)
	}
}

func TestFeedIncludesOwnAndFollowedSessions(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")
	bob := mustUser(t, s, "bob@example.com")
	carol := mustUser(t, s, "carol@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	if _, err := s.CreateSession(alice, mathID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil); err != nil {
		t.Fatalf("alice session: %v", err)
	}
	if _, err := s.CreateSession(bob, mathID, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("bob session: %v", err)
	}
	if _, err := s.CreateSession(carol, mathID, "2026-07-29T09:00:00", "2026-07-29T10:00:00", "timer", nil); err != nil {
		t.Fatalf("carol session: %v", err)
	}

	if err := s.Follow(alice, bob); err != nil {
		t.Fatalf("follow bob: %v", err)
	}

	items, err := s.Feed(alice, 50, 0)
	if err != nil {
		t.Fatalf("feed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("got %d items, want 2 (own + bob, not carol)", len(items))
	}
	if items[0].User.Email != "alice@example.com" || items[1].User.Email != "bob@example.com" {
		t.Fatalf("order/users = %+v", items)
	}
	if items[0].Session.SubjectName != "math" {
		t.Fatalf("session = %+v", items[0].Session)
	}
}

func TestKudosFlow(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")
	bob := mustUser(t, s, "bob@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	sess, err := s.CreateSession(alice, mathID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := s.Follow(bob, alice); err != nil {
		t.Fatalf("follow alice: %v", err)
	}

	if err := s.AddKudos(bob, sess.ID); err != nil {
		t.Fatalf("kudos: %v", err)
	}
	// Idempotent.
	if err := s.AddKudos(bob, sess.ID); err != nil {
		t.Fatalf("kudos again: %v", err)
	}
	// Cannot kudos own session.
	if err := s.AddKudos(alice, sess.ID); !errors.Is(err, ErrSelfKudos) {
		t.Fatalf("self kudos err = %v, want ErrSelfKudos", err)
	}
	// Missing session.
	if err := s.AddKudos(bob, 999); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing session err = %v, want ErrNotFound", err)
	}

	items, err := s.Feed(bob, 50, 0)
	if err != nil {
		t.Fatalf("feed: %v", err)
	}
	if len(items) != 1 || items[0].KudosCount != 1 || !items[0].KudosByMe {
		t.Fatalf("feed = %+v", items)
	}

	if err := s.RemoveKudos(bob, sess.ID); err != nil {
		t.Fatalf("remove kudos: %v", err)
	}
	items, err = s.Feed(bob, 50, 0)
	if err != nil {
		t.Fatalf("feed after remove: %v", err)
	}
	if items[0].KudosCount != 0 || items[0].KudosByMe {
		t.Fatalf("feed after remove = %+v", items[0])
	}
}

func TestFriendLeaderboard(t *testing.T) {
	s := newTestStore(t)
	alice := mustUser(t, s, "alice@example.com")
	bob := mustUser(t, s, "bob@example.com")
	carol := mustUser(t, s, "carol@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	now := mustParse(t, "2026-07-31T12:00:00")
	// Week: Mon 2026-07-27 .. Sun 2026-08-02.
	if _, err := s.CreateSession(alice, mathID, "2026-07-27T09:00:00", "2026-07-27T11:00:00", "timer", nil); err != nil {
		t.Fatalf("alice: %v", err)
	}
	if _, err := s.CreateSession(bob, mathID, "2026-07-28T09:00:00", "2026-07-28T10:30:00", "timer", nil); err != nil {
		t.Fatalf("bob: %v", err)
	}
	if _, err := s.CreateSession(carol, mathID, "2026-07-20T09:00:00", "2026-07-20T10:00:00", "timer", nil); err != nil {
		t.Fatalf("carol last week: %v", err)
	}

	if err := s.Follow(alice, bob); err != nil {
		t.Fatalf("follow bob: %v", err)
	}
	if err := s.Follow(alice, carol); err != nil {
		t.Fatalf("follow carol: %v", err)
	}

	entries, err := s.FriendLeaderboard(alice, now)
	if err != nil {
		t.Fatalf("leaderboard: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("got %d entries, want 3 (me + 2 followees)", len(entries))
	}
	if entries[0].Email != "alice@example.com" || entries[0].Minutes != 120 || !entries[0].IsSelf {
		t.Fatalf("first = %+v", entries[0])
	}
	if entries[1].Email != "bob@example.com" || entries[1].Minutes != 90 || entries[1].IsSelf {
		t.Fatalf("second = %+v", entries[1])
	}
	if entries[2].Email != "carol@example.com" || entries[2].Minutes != 0 {
		t.Fatalf("third = %+v (last week must not count)", entries[2])
	}
}
