package store

import (
	"testing"
	"time"
)

func TestSummary(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "stats@example.com")
	math := mustSubject(t, s, userID, "Math")
	hist := mustSubject(t, s, userID, "History")

	// Same-day sessions: 90 + 60 minutes
	if _, err := s.CreateSession(userID, math, "2026-07-29T09:00:00", "2026-07-29T10:30:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, hist, "2026-07-29T14:00:00", "2026-07-29T15:00:00", "manual", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Yesterday
	if _, err := s.CreateSession(userID, math, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Today
	if _, err := s.CreateSession(userID, math, "2026-07-31T09:00:00", "2026-07-31T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	// Last week, out of the current week
	if _, err := s.CreateSession(userID, hist, "2026-07-20T09:00:00", "2026-07-20T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if sum.TotalMinutes != 330 { // 90 + 60 + 60 + 60 + 60 (incl. last-week session)
		t.Fatalf("total = %d, want 330", sum.TotalMinutes)
	}
	if sum.WeekMinutes != 270 { // 150 (29th: 90 + 60) + 60 (30th) + 60 (31st)
		t.Fatalf("week = %d, want 270", sum.WeekMinutes)
	}
	if sum.StreakDays != 3 { // 29th, 30th, 31st
		t.Fatalf("streak = %d, want 3", sum.StreakDays)
	}
	if len(sum.PerSubject) != 2 {
		t.Fatalf("per subject = %d entries, want 2", len(sum.PerSubject))
	}
	if sum.PerSubject[0].Name != "Math" || sum.PerSubject[0].Minutes != 210 {
		t.Fatalf("first subject = %+v, want Math 210", sum.PerSubject[0])
	}
}

func TestWeekBoundaryIsMondayStart(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "week@example.com")
	math := mustSubject(t, s, userID, "Math")

	// Sunday 2026-07-26 is in the previous week; Monday 2026-07-27 starts the current one.
	if _, err := s.CreateSession(userID, math, "2026-07-26T09:00:00", "2026-07-26T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create sunday: %v", err)
	}
	if _, err := s.CreateSession(userID, math, "2026-07-27T09:00:00", "2026-07-27T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create monday: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if sum.WeekMinutes != 60 { // only the Monday session
		t.Fatalf("week = %d, want 60", sum.WeekMinutes)
	}
	if sum.TotalMinutes != 120 { // both count for lifetime
		t.Fatalf("total = %d, want 120", sum.TotalMinutes)
	}
}

func TestWeekExcludesSessionsFromNextWeek(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "future@example.com")
	math := mustSubject(t, s, userID, "Math")

	// Monday 2026-07-27 starts the current week; Monday 2026-08-03 is next week.
	if _, err := s.CreateSession(userID, math, "2026-07-27T09:00:00", "2026-07-27T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create monday: %v", err)
	}
	if _, err := s.CreateSession(userID, math, "2026-08-03T09:00:00", "2026-08-03T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create next monday: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if sum.WeekMinutes != 60 { // only the current-week session
		t.Fatalf("week = %d, want 60", sum.WeekMinutes)
	}
	if sum.TotalMinutes != 120 { // both count for lifetime
		t.Fatalf("total = %d, want 120", sum.TotalMinutes)
	}
}

func TestSummaryEmpty(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "empty@example.com")

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}

	if sum.TotalMinutes != 0 {
		t.Fatalf("total = %d, want 0", sum.TotalMinutes)
	}
	if sum.WeekMinutes != 0 {
		t.Fatalf("week = %d, want 0", sum.WeekMinutes)
	}
	if sum.StreakDays != 0 {
		t.Fatalf("streak = %d, want 0", sum.StreakDays)
	}
	if sum.PerSubject == nil {
		t.Fatal("per subject = nil, want empty non-nil slice")
	}
	if len(sum.PerSubject) != 0 {
		t.Fatalf("per subject = %d entries, want 0", len(sum.PerSubject))
	}
}

func TestStreakDoesNotBreakOnTodayWithoutStudy(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "streak@example.com")
	sub := mustSubject(t, s, userID, "Math")

	if _, err := s.CreateSession(userID, sub, "2026-07-29T09:00:00", "2026-07-29T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if sum.StreakDays != 2 {
		t.Fatalf("streak = %d, want 2", sum.StreakDays)
	}
}

func TestStreakResetsAfterGap(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "gap@example.com")
	sub := mustSubject(t, s, userID, "Math")

	if _, err := s.CreateSession(userID, sub, "2026-07-28T09:00:00", "2026-07-28T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := s.CreateSession(userID, sub, "2026-07-30T09:00:00", "2026-07-30T10:00:00", "timer", nil); err != nil {
		t.Fatalf("create: %v", err)
	}

	now, err := time.Parse(timeFormat, "2026-07-31T12:00:00")
	if err != nil {
		t.Fatalf("parse now: %v", err)
	}
	sum, err := s.Summary(userID, now)
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if sum.StreakDays != 1 { // only 30th, gap before 28th
		t.Fatalf("streak = %d, want 1", sum.StreakDays)
	}
}
