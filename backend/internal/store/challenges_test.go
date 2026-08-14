package store

import (
	"testing"
	"time"
)

func mustParse(t *testing.T, s string) time.Time {
	t.Helper()
	now, err := time.Parse(timeFormat, s)
	if err != nil {
		t.Fatalf("parse %s: %v", s, err)
	}
	return now
}

func TestCurrentChallengeRotatesByWeek(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "rot@example.com")

	weekA, err := s.CurrentChallenge(userID, mustParse(t, "2026-07-31T12:00:00"))
	if err != nil {
		t.Fatalf("week a: %v", err)
	}
	weekB, err := s.CurrentChallenge(userID, mustParse(t, "2026-08-14T12:00:00"))
	if err != nil {
		t.Fatalf("week b: %v", err)
	}
	if weekA.Challenge.Code == "" || weekA.Challenge.Name == "" || weekA.Challenge.Target <= 0 {
		t.Fatalf("bad challenge: %+v", weekA.Challenge)
	}
	if weekA.Challenge.Code == weekB.Challenge.Code {
		t.Fatalf("challenge did not rotate: %s == %s", weekA.Challenge.Code, weekB.Challenge.Code)
	}
}

func TestCurrentChallengeEmptyWeek(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "empty@example.com")

	now := mustParse(t, "2026-07-31T12:00:00")
	progress, err := s.CurrentChallenge(userID, now)
	if err != nil {
		t.Fatalf("challenge: %v", err)
	}
	if progress.Value != 0 || progress.Completed {
		t.Fatalf("got %+v, want zero value and not completed", progress)
	}
	if progress.DaysLeft != 3 { // Friday (index 4) → 7 - 4 = 3
		t.Fatalf("days_left = %d, want 3", progress.DaysLeft)
	}
}

func TestCurrentChallengeCountsProgressByType(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "prog@example.com")
	mathID := mustCatalogSubject(t, s, "math")
	histID := mustCatalogSubject(t, s, "history")
	langID := mustCatalogSubject(t, s, "language")

	now := mustParse(t, "2026-07-31T12:00:00")
	// One week (Mon 2026-07-27 .. Sun 2026-08-02): 3 subjects, 4 days, 240 min.
	sessions := []struct {
		subject int64
		day     string
		minutes int
	}{
		{mathID, "2026-07-27", 90},
		{mathID, "2026-07-28", 60},
		{histID, "2026-07-29", 30},
		{langID, "2026-07-31", 60},
	}
	for _, sess := range sessions {
		if _, err := s.CreateSession(userID, sess.subject, sess.day+"T09:00:00", sess.day+"T10:00:00", "timer", nil); err != nil {
			t.Fatalf("create %s: %v", sess.day, err)
		}
	}

	progress, err := s.CurrentChallenge(userID, now)
	if err != nil {
		t.Fatalf("challenge: %v", err)
	}
	switch progress.Challenge.Code {
	case "weekly_420", "weekly_600":
		if progress.Value != 240 {
			t.Fatalf("value = %d, want 240", progress.Value)
		}
	case "weekly_5days":
		if progress.Value != 4 {
			t.Fatalf("value = %d, want 4 days", progress.Value)
		}
	case "weekly_3subjects":
		if progress.Value != 3 {
			t.Fatalf("value = %d, want 3 subjects", progress.Value)
		}
	}
}

func TestCurrentChallengeCompleted(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "done@example.com")
	mathID := mustCatalogSubject(t, s, "math")
	histID := mustCatalogSubject(t, s, "history")
	langID := mustCatalogSubject(t, s, "language")

	now := mustParse(t, "2026-07-31T12:00:00")
	// Enough to complete any catalog challenge: 700 min, 5 days, 3 subjects.
	days := []string{"2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"}
	subjects := []int64{mathID, histID, langID}
	for i, day := range days {
		if _, err := s.CreateSession(userID, subjects[i%3], day+"T09:00:00", day+"T11:20:00", "timer", nil); err != nil {
			t.Fatalf("create %s: %v", day, err)
		}
	}

	progress, err := s.CurrentChallenge(userID, now)
	if err != nil {
		t.Fatalf("challenge: %v", err)
	}
	if !progress.Completed {
		t.Fatalf("got %+v, want completed", progress)
	}
	if progress.Value < progress.Challenge.Target {
		t.Fatalf("value %d < target %d", progress.Value, progress.Challenge.Target)
	}
}

func TestTrendZeroFillsAndAggregates(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "trend@example.com")
	mathID := mustCatalogSubject(t, s, "math")
	histID := mustCatalogSubject(t, s, "history")

	now := mustParse(t, "2026-07-31T12:00:00")
	// 3 days back: 90m math at 09:00, 60m history at 21:30, 30m math today.
	if _, err := s.CreateSession(userID, mathID, "2026-07-28T09:00:00", "2026-07-28T10:30:00", "timer", nil); err != nil {
		t.Fatalf("create 1: %v", err)
	}
	if _, err := s.CreateSession(userID, histID, "2026-07-29T21:30:00", "2026-07-29T22:30:00", "timer", nil); err != nil {
		t.Fatalf("create 2: %v", err)
	}
	if _, err := s.CreateSession(userID, mathID, "2026-07-31T09:00:00", "2026-07-31T09:30:00", "manual", nil); err != nil {
		t.Fatalf("create 3: %v", err)
	}
	// Outside the window.
	if _, err := s.CreateSession(userID, mathID, "2026-07-01T09:00:00", "2026-07-01T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create 4: %v", err)
	}

	trend, err := s.Trend(userID, 7, now)
	if err != nil {
		t.Fatalf("trend: %v", err)
	}
	if trend.Days != 7 || len(trend.Daily) != 7 {
		t.Fatalf("days = %d, daily len = %d, want 7/7", trend.Days, len(trend.Daily))
	}
	if trend.Daily[0].Date != "2026-07-25" || trend.Daily[0].Minutes != 0 {
		t.Fatalf("first day = %+v", trend.Daily[0])
	}
	if trend.Daily[3].Minutes != 90 || trend.Daily[4].Minutes != 60 || trend.Daily[6].Minutes != 30 {
		t.Fatalf("daily = %+v", trend.Daily)
	}
	if trend.TotalMinutes != 180 {
		t.Fatalf("total = %d, want 180", trend.TotalMinutes)
	}
	if trend.LongestSessionMinutes != 90 {
		t.Fatalf("longest = %d, want 90", trend.LongestSessionMinutes)
	}
	if trend.AvgPerDayMinutes != float64(180)/7 {
		t.Fatalf("avg = %f", trend.AvgPerDayMinutes)
	}
	if trend.BusiestHour != 9 {
		t.Fatalf("busiest hour = %d, want 9", trend.BusiestHour)
	}
	// math 120 > history 60, math first.
	if len(trend.PerSubject) != 2 || trend.PerSubject[0].Name != "math" || trend.PerSubject[0].Minutes != 120 {
		t.Fatalf("per_subject = %+v", trend.PerSubject)
	}
}

func TestTrendEmpty(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "trend0@example.com")

	trend, err := s.Trend(userID, 30, mustParse(t, "2026-07-31T12:00:00"))
	if err != nil {
		t.Fatalf("trend: %v", err)
	}
	if len(trend.Daily) != 30 || trend.TotalMinutes != 0 || trend.BusiestHour != -1 {
		t.Fatalf("got %+v", trend)
	}
}
