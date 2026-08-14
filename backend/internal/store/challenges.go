package store

import (
	"fmt"
	"time"
)

// Challenge is a fixed weekly goal the user can work toward. The active
// challenge rotates through the catalog each week.
type Challenge struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Target      int64  `json:"target"`
	Unit        string `json:"unit"`
}

// ChallengeProgress is the active challenge with the user's current value.
type ChallengeProgress struct {
	Challenge Challenge `json:"challenge"`
	Value     int64     `json:"value"`
	Completed bool      `json:"completed"`
	DaysLeft  int       `json:"days_left"`
}

var challengeCatalog = []Challenge{
	{Code: "weekly_420", Name: "7-hour week", Description: "Study 7 hours this week", Target: 420, Unit: "minutes"},
	{Code: "weekly_600", Name: "10-hour week", Description: "Study 10 hours this week", Target: 600, Unit: "minutes"},
	{Code: "weekly_5days", Name: "Five-day rhythm", Description: "Study on 5 different days this week", Target: 5, Unit: "days"},
	{Code: "weekly_3subjects", Name: "Subject explorer", Description: "Study in 3 different subjects this week", Target: 3, Unit: "subjects"},
}

// weekNumber returns a monotonically increasing week index (Monday-based)
// used to rotate the challenge catalog deterministically.
func weekNumber(now time.Time) int64 {
	start := startOfWeek(now)
	return start.Unix() / (7 * 24 * 3600)
}

// CurrentChallenge returns the active challenge for the user's current week
// along with their progress computed from sessions.
func (s *Store) CurrentChallenge(userID int64, now time.Time) (*ChallengeProgress, error) {
	challenge := challengeCatalog[weekNumber(now)%int64(len(challengeCatalog))]

	weekStart := startOfWeek(now)
	weekEnd := weekStart.AddDate(0, 0, 7)

	rows, err := s.db.Query(
		`SELECT subject_id, started_at, duration_minutes FROM sessions
		 WHERE user_id = ? AND date(started_at) >= ? AND date(started_at) < ?`,
		userID, weekStart.Format("2006-01-02"), weekEnd.Format("2006-01-02"),
	)
	if err != nil {
		return nil, fmt.Errorf("challenge sessions: %w", err)
	}
	defer rows.Close()

	var minutes, days, subjects int64
	daySet := map[string]bool{}
	subjectSet := map[int64]bool{}
	for rows.Next() {
		var subjectID int64
		var started string
		var duration int64
		if err := rows.Scan(&subjectID, &started, &duration); err != nil {
			return nil, fmt.Errorf("scan challenge session: %w", err)
		}
		minutes += duration
		daySet[started[:10]] = true
		subjectSet[subjectID] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("challenge rows: %w", err)
	}
	days = int64(len(daySet))
	subjects = int64(len(subjectSet))

	var value int64
	switch challenge.Code {
	case "weekly_420", "weekly_600":
		value = minutes
	case "weekly_5days":
		value = days
	case "weekly_3subjects":
		value = subjects
	}

	weekdayIndex := (int(now.Weekday()) + 6) % 7 // Monday = 0
	return &ChallengeProgress{
		Challenge: challenge,
		Value:     value,
		Completed: value >= challenge.Target,
		DaysLeft:  7 - weekdayIndex,
	}, nil
}
