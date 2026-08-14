package store

import (
	"fmt"
	"time"
)

// Settings holds a user's configurable study goals and reminder preferences.
type Settings struct {
	UserID            int64  `json:"-"`
	DailyGoalMinutes  int    `json:"daily_goal_minutes"`
	WeeklyGoalMinutes int    `json:"weekly_goal_minutes"`
	ReminderEnabled   bool   `json:"reminder_enabled"`
	ReminderTime      string `json:"reminder_time"`
	UpdatedAt         string `json:"updated_at"`
}

// GetSettings returns the user's settings, creating a default row on first
// access so every user always has one.
func (s *Store) GetSettings(userID int64) (*Settings, error) {
	if _, err := s.db.Exec(
		`INSERT OR IGNORE INTO settings (user_id, updated_at) VALUES (?, ?)`,
		userID, time.Now().Format(timeFormat),
	); err != nil {
		return nil, fmt.Errorf("ensure settings row: %w", err)
	}
	settings := &Settings{}
	err := s.db.QueryRow(
		`SELECT user_id, daily_goal_minutes, weekly_goal_minutes,
		        reminder_enabled, reminder_time, updated_at
		 FROM settings WHERE user_id = ?`, userID,
	).Scan(&settings.UserID, &settings.DailyGoalMinutes, &settings.WeeklyGoalMinutes,
		&settings.ReminderEnabled, &settings.ReminderTime, &settings.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("query settings: %w", err)
	}
	return settings, nil
}

// UpdateSettings upserts the user's goals and reminder preferences and
// returns the updated settings.
func (s *Store) UpdateSettings(userID int64, daily, weekly int, reminderEnabled bool, reminderTime string) (*Settings, error) {
	now := time.Now().Format(timeFormat)
	if _, err := s.db.Exec(
		`INSERT INTO settings (user_id, daily_goal_minutes, weekly_goal_minutes,
		        reminder_enabled, reminder_time, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET
		   daily_goal_minutes = excluded.daily_goal_minutes,
		   weekly_goal_minutes = excluded.weekly_goal_minutes,
		   reminder_enabled = excluded.reminder_enabled,
		   reminder_time = excluded.reminder_time,
		   updated_at = excluded.updated_at`,
		userID, daily, weekly, reminderEnabled, reminderTime, now,
	); err != nil {
		return nil, fmt.Errorf("upsert settings: %w", err)
	}
	return s.GetSettings(userID)
}
