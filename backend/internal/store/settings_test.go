package store

import "testing"

func TestGetSettingsDefaults(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "settings@example.com")

	settings, err := s.GetSettings(userID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if settings.DailyGoalMinutes != 120 || settings.WeeklyGoalMinutes != 840 {
		t.Fatalf("got %+v, want defaults 120/840", settings)
	}
}

func TestGetSettingsIsIdempotent(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "twice@example.com")

	if _, err := s.GetSettings(userID); err != nil {
		t.Fatalf("first get: %v", err)
	}
	settings, err := s.GetSettings(userID)
	if err != nil {
		t.Fatalf("second get: %v", err)
	}
	if settings.DailyGoalMinutes != 120 {
		t.Fatalf("got %+v, want unchanged defaults", settings)
	}
}

func TestUpdateSettings(t *testing.T) {
	s := newTestStore(t)
	userID := mustUser(t, s, "update@example.com")

	updated, err := s.UpdateSettings(userID, 90, 600, true, "20:00")
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.DailyGoalMinutes != 90 || updated.WeeklyGoalMinutes != 600 {
		t.Fatalf("got %+v", updated)
	}

	again, err := s.UpdateSettings(userID, 45, 300, false, "07:30")
	if err != nil {
		t.Fatalf("second update: %v", err)
	}
	if again.DailyGoalMinutes != 45 || again.WeeklyGoalMinutes != 300 {
		t.Fatalf("got %+v, want upserted values", again)
	}

	settings, err := s.GetSettings(userID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if settings.DailyGoalMinutes != 45 || settings.WeeklyGoalMinutes != 300 {
		t.Fatalf("got %+v, want persisted values", settings)
	}
}

func TestSettingsArePerUser(t *testing.T) {
	s := newTestStore(t)
	userA := mustUser(t, s, "a@example.com")
	userB := mustUser(t, s, "b@example.com")

	if _, err := s.UpdateSettings(userA, 30, 300, true, "19:00"); err != nil {
		t.Fatalf("update a: %v", err)
	}
	settingsB, err := s.GetSettings(userB)
	if err != nil {
		t.Fatalf("get b: %v", err)
	}
	if settingsB.DailyGoalMinutes != 120 || settingsB.WeeklyGoalMinutes != 840 {
		t.Fatalf("user b got %+v, want defaults", settingsB)
	}
}
