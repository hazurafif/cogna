package store

import (
	"fmt"
	"time"
)

// SubjectTot is the total study minutes per subject.
type SubjectTot struct {
	SubjectID int64  `json:"subject_id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	Minutes   int64  `json:"minutes"`
}

// Summary is the aggregated study stats for a user.
type Summary struct {
	TotalMinutes int64        `json:"total_minutes"`
	WeekMinutes  int64        `json:"week_minutes"`
	StreakDays   int          `json:"streak_days"`
	PerSubject   []SubjectTot `json:"per_subject"`
}

// Summary computes the user's lifetime and current-week minutes, the current
// streak of consecutive study days, and totals per subject.
func (s *Store) Summary(userID int64, now time.Time) (*Summary, error) {
	sum := &Summary{PerSubject: []SubjectTot{}}

	if err := s.db.QueryRow(
		`SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions WHERE user_id = ?`,
		userID,
	).Scan(&sum.TotalMinutes); err != nil {
		return nil, fmt.Errorf("sum total: %w", err)
	}

	weekStart := startOfWeek(now).Format("2006-01-02")
	weekEnd := startOfWeek(now).AddDate(0, 0, 7).Format("2006-01-02")
	if err := s.db.QueryRow(
		`SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions
		 WHERE user_id = ? AND date(started_at) >= ? AND date(started_at) < ?`,
		userID, weekStart, weekEnd,
	).Scan(&sum.WeekMinutes); err != nil {
		return nil, fmt.Errorf("sum week: %w", err)
	}

	rows, err := s.db.Query(
		`SELECT sub.id, sub.name, sub.icon, SUM(sess.duration_minutes)
		 FROM sessions sess JOIN subjects sub ON sub.id = sess.subject_id
		 WHERE sess.user_id = ?
		 GROUP BY sub.id, sub.name, sub.icon
		 ORDER BY SUM(sess.duration_minutes) DESC, sub.id ASC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("per subject: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var tot SubjectTot
		if err := rows.Scan(&tot.SubjectID, &tot.Name, &tot.Icon, &tot.Minutes); err != nil {
			return nil, fmt.Errorf("scan subject total: %w", err)
		}
		sum.PerSubject = append(sum.PerSubject, tot)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("per subject rows: %w", err)
	}

	days, err := s.studyDays(userID)
	if err != nil {
		return nil, err
	}
	sum.StreakDays = currentStreak(days, now)
	return sum, nil
}

func (s *Store) studyDays(userID int64) (map[string]bool, error) {
	rows, err := s.db.Query(
		`SELECT DISTINCT date(started_at) FROM sessions WHERE user_id = ?`, userID)
	if err != nil {
		return nil, fmt.Errorf("study days: %w", err)
	}
	defer rows.Close()
	days := map[string]bool{}
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan day: %w", err)
		}
		days[d] = true
	}
	return days, rows.Err()
}

func startOfWeek(now time.Time) time.Time {
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	offset := (int(day.Weekday()) + 6) % 7 // Monday = 0
	return day.AddDate(0, 0, -offset)
}

// currentStreak counts consecutive study days ending today, or ending
// yesterday if today has no study yet (the streak is still alive).
func currentStreak(days map[string]bool, now time.Time) int {
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if !days[day.Format("2006-01-02")] {
		day = day.AddDate(0, 0, -1)
	}
	streak := 0
	for days[day.Format("2006-01-02")] {
		streak++
		day = day.AddDate(0, 0, -1)
	}
	return streak
}
