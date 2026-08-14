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
		 FROM sessions sess JOIN subject_catalog sub ON sub.id = sess.subject_id
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

// TrendPoint is a single day's study minutes within a trend window.
type TrendPoint struct {
	Date    string `json:"date"`
	Minutes int64  `json:"minutes"`
}

// Trend is the per-day and per-subject breakdown for the last N days.
type Trend struct {
	Days                  int          `json:"days"`
	Daily                 []TrendPoint `json:"daily"`
	PerSubject            []SubjectTot `json:"per_subject"`
	TotalMinutes          int64        `json:"total_minutes"`
	LongestSessionMinutes int64        `json:"longest_session_minutes"`
	AvgPerDayMinutes      float64      `json:"avg_per_day_minutes"`
	BusiestHour           int          `json:"busiest_hour"` // -1 when there are no sessions
}

// Trend returns the user's per-day and per-subject minutes for the last days
// calendar days (zero-filled), plus summary insights over that window.
func (s *Store) Trend(userID int64, days int, now time.Time) (*Trend, error) {
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -(days - 1))

	rows, err := s.db.Query(
		`SELECT s.subject_id, sub.name, sub.icon, s.started_at, s.duration_minutes
		 FROM sessions s JOIN subject_catalog sub ON sub.id = s.subject_id
		 WHERE s.user_id = ? AND date(s.started_at) >= ?`,
		userID, start.Format("2006-01-02"),
	)
	if err != nil {
		return nil, fmt.Errorf("trend sessions: %w", err)
	}
	defer rows.Close()

	daily := map[string]int64{}
	subjects := map[int64]*SubjectTot{}
	hourly := map[int]int64{}
	trend := &Trend{Days: days, BusiestHour: -1}

	for rows.Next() {
		var subjectID int64
		var name, icon, started string
		var minutes int64
		if err := rows.Scan(&subjectID, &name, &icon, &started, &minutes); err != nil {
			return nil, fmt.Errorf("scan trend session: %w", err)
		}
		trend.TotalMinutes += minutes
		daily[started[:10]] += minutes
		if minutes > trend.LongestSessionMinutes {
			trend.LongestSessionMinutes = minutes
		}
		if sub, ok := subjects[subjectID]; ok {
			sub.Minutes += minutes
		} else {
			subjects[subjectID] = &SubjectTot{SubjectID: subjectID, Name: name, Icon: icon, Minutes: minutes}
		}
		if t, err := time.Parse(timeFormat, started); err == nil {
			hourly[t.Hour()] += minutes
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("trend rows: %w", err)
	}

	for i := 0; i < days; i++ {
		d := start.AddDate(0, 0, i)
		key := d.Format("2006-01-02")
		trend.Daily = append(trend.Daily, TrendPoint{Date: key, Minutes: daily[key]})
	}

	for _, sub := range subjects {
		trend.PerSubject = append(trend.PerSubject, *sub)
	}
	// Stable ordering by total minutes desc, then id.
	for i := 0; i < len(trend.PerSubject); i++ {
		for j := i + 1; j < len(trend.PerSubject); j++ {
			if trend.PerSubject[j].Minutes > trend.PerSubject[i].Minutes ||
				(trend.PerSubject[j].Minutes == trend.PerSubject[i].Minutes &&
					trend.PerSubject[j].SubjectID < trend.PerSubject[i].SubjectID) {
				trend.PerSubject[i], trend.PerSubject[j] = trend.PerSubject[j], trend.PerSubject[i]
			}
		}
	}

	if trend.TotalMinutes > 0 {
		trend.AvgPerDayMinutes = float64(trend.TotalMinutes) / float64(days)
		busiest := -1
		var maxMinutes int64
		for hour, m := range hourly {
			if m > maxMinutes || (m == maxMinutes && (busiest == -1 || hour < busiest)) {
				busiest = hour
				maxMinutes = m
			}
		}
		trend.BusiestHour = busiest
	}
	return trend, nil
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
