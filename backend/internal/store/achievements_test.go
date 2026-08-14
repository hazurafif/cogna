package store

import "testing"

func TestListAchievementsAllLocked(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "ach@example.com")

	achievements, err := s.ListAchievements(userID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(achievements) != 10 {
		t.Fatalf("catalog = %d, want 10", len(achievements))
	}
	for _, a := range achievements {
		if a.Unlocked {
			t.Fatalf("%s should be locked", a.Code)
		}
		if a.Name == "" || a.Icon == "" {
			t.Fatalf("%s incomplete: %+v", a.Code, a)
		}
	}
}

func TestEvaluateAchievementsFirstSession(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "first@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	if _, err := s.CreateSession(userID, mathID, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	newly, err := s.EvaluateAchievements(userID)
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	codes := map[string]bool{}
	for _, a := range newly {
		codes[a.Code] = true
	}
	if len(newly) != 1 || !codes["first_session"] {
		t.Fatalf("newly = %+v, want only first_session", newly)
	}
	if newly[0].Name == "" || newly[0].Icon != "zap" {
		t.Fatalf("bad achievement: %+v", newly[0])
	}

	again, err := s.EvaluateAchievements(userID)
	if err != nil {
		t.Fatalf("re-evaluate: %v", err)
	}
	if len(again) != 0 {
		t.Fatalf("re-evaluate returned %+v, want none", again)
	}
}

func TestEvaluateAchievementsStreakTotalAndWeek(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "streak@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	// Mon 2026-07-27 .. Sun 2026-08-02: one week, 7 consecutive days, 90m each.
	start := "2026-07-27"
	for i := 0; i < 7; i++ {
		day := addDays(t, start, i)
		if _, err := s.CreateSession(userID, mathID, day+"T09:00:00", day+"T10:30:00", "timer", nil); err != nil {
			t.Fatalf("create %d: %v", i, err)
		}
	}

	newly, err := s.EvaluateAchievements(userID)
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	codes := map[string]bool{}
	for _, a := range newly {
		codes[a.Code] = true
	}
	for _, want := range []string{"streak_3", "streak_7", "total_10h", "week_10h"} {
		if !codes[want] {
			t.Fatalf("newly = %+v, want %s", newly, want)
		}
	}
	if codes["streak_30"] || codes["total_50h"] {
		t.Fatalf("too many unlocks: %+v", newly)
	}
}

func TestEvaluateAchievementsNightOwl(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "owl@example.com")
	mathID := mustCatalogSubject(t, s, "math")

	for i := 1; i <= 5; i++ {
		if _, err := s.CreateSession(userID, mathID,
			"2026-07-2"+string(rune('0'+i))+"T22:00:00",
			"2026-07-2"+string(rune('0'+i))+"T23:00:00", "timer", nil); err != nil {
			t.Fatalf("create %d: %v", i, err)
		}
	}

	newly, err := s.EvaluateAchievements(userID)
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	codes := map[string]bool{}
	for _, a := range newly {
		codes[a.Code] = true
	}
	if !codes["night_owl"] {
		t.Fatalf("newly = %+v, want night_owl", newly)
	}
}

func TestEvaluateAchievementsAllSubjects(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "ren@example.com")

	names := []string{"math", "science", "language", "programming", "reading",
		"writing", "history", "music", "art", "test-prep", "other"}
	for i, name := range names {
		subjectID := mustCatalogSubject(t, s, name)
		day := addDays(t, "2026-07-01", i)
		if _, err := s.CreateSession(userID, subjectID, day+"T09:00:00", day+"T09:01:00", "manual", nil); err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
	}

	newly, err := s.EvaluateAchievements(userID)
	if err != nil {
		t.Fatalf("evaluate: %v", err)
	}
	codes := map[string]bool{}
	for _, a := range newly {
		codes[a.Code] = true
	}
	if !codes["all_subjects"] {
		t.Fatalf("newly = %+v, want all_subjects", newly)
	}
	if !codes["first_session"] {
		t.Fatalf("newly = %+v, want first_session", newly)
	}
}

func addDays(t *testing.T, start string, n int) string {
	t.Helper()
	date, err := ParseTimestamp(start + "T00:00:00")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return date.AddDate(0, 0, n).Format("2006-01-02")
}
