package store

import (
	"fmt"
	"sort"
	"time"
)

// Achievement is a catalog badge with the user's unlock state.
type Achievement struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Icon        string  `json:"icon"`
	Unlocked    bool    `json:"unlocked"`
	UnlockedAt  *string `json:"unlocked_at"`
}

// ListAchievements returns the full catalog with the user's unlock state,
// ordered by sort_order.
func (s *Store) ListAchievements(userID int64) ([]Achievement, error) {
	rows, err := s.db.Query(
		`SELECT a.code, a.name, a.description, a.icon,
		        ua.unlocked_at IS NOT NULL, ua.unlocked_at
		 FROM achievements a
		 LEFT JOIN user_achievements ua ON ua.code = a.code AND ua.user_id = ?
		 ORDER BY a.sort_order`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list achievements: %w", err)
	}
	defer rows.Close()

	achievements := make([]Achievement, 0)
	for rows.Next() {
		var a Achievement
		if err := rows.Scan(&a.Code, &a.Name, &a.Description, &a.Icon, &a.Unlocked, &a.UnlockedAt); err != nil {
			return nil, fmt.Errorf("scan achievement: %w", err)
		}
		achievements = append(achievements, a)
	}
	return achievements, rows.Err()
}

// sessionDigest is the per-session data needed to evaluate achievements.
type sessionDigest struct {
	SubjectID       int64
	StartedAt       time.Time
	DurationMinutes int64
}

// bestStreak returns the longest run of consecutive study days.
func bestStreak(days map[string]bool) int {
	keys := make([]string, 0, len(days))
	for k := range days {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	best := 0
	run := 0
	var prev string
	for i, k := range keys {
		if i > 0 {
			prevTime, _ := time.Parse("2006-01-02", prev)
			curTime, _ := time.Parse("2006-01-02", k)
			if curTime.Sub(prevTime).Hours() == 24 {
				run++
			} else {
				run = 1
			}
		} else {
			run = 1
		}
		if run > best {
			best = run
		}
		prev = k
	}
	return best
}

// EvaluateAchievements checks the user's sessions against the catalog and
// unlocks any new badges. It returns the achievements newly unlocked.
func (s *Store) EvaluateAchievements(userID int64) ([]Achievement, error) {
	rows, err := s.db.Query(
		`SELECT subject_id, started_at, duration_minutes FROM sessions WHERE user_id = ?`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("load sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]sessionDigest, 0)
	for rows.Next() {
		var d sessionDigest
		var started string
		if err := rows.Scan(&d.SubjectID, &started, &d.DurationMinutes); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		d.StartedAt, _ = time.Parse(timeFormat, started)
		sessions = append(sessions, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("session rows: %w", err)
	}

	// Aggregate conditions from the session history.
	var totalMinutes int64
	var nightOwl int
	subjects := map[int64]bool{}
	daySet := map[string]bool{}
	weekTotals := map[string]int64{}
	for _, s := range sessions {
		totalMinutes += s.DurationMinutes
		if s.StartedAt.Hour() >= 21 {
			nightOwl++
		}
		subjects[s.SubjectID] = true
		daySet[s.StartedAt.Format("2006-01-02")] = true
		weekKey := startOfWeek(s.StartedAt).Format("2006-01-02")
		weekTotals[weekKey] += s.DurationMinutes
	}
	var maxWeekMinutes int64
	for _, m := range weekTotals {
		if m > maxWeekMinutes {
			maxWeekMinutes = m
		}
	}
	streak := bestStreak(daySet)

	var catalogCount int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM subject_catalog`).Scan(&catalogCount); err != nil {
		return nil, fmt.Errorf("count catalog: %w", err)
	}

	conditions := map[string]bool{
		"first_session": len(sessions) > 0,
		"streak_3":      streak >= 3,
		"streak_7":      streak >= 7,
		"streak_30":     streak >= 30,
		"total_10h":     totalMinutes >= 10*60,
		"total_50h":     totalMinutes >= 50*60,
		"total_100h":    totalMinutes >= 100*60,
		"week_10h":      maxWeekMinutes >= 10*60,
		"night_owl":     nightOwl >= 5,
		"all_subjects":  len(subjects) >= catalogCount,
	}

	rows2, err := s.db.Query(
		`SELECT code FROM user_achievements WHERE user_id = ?`, userID)
	if err != nil {
		return nil, fmt.Errorf("load unlocks: %w", err)
	}
	defer rows2.Close()
	unlocked := map[string]bool{}
	for rows2.Next() {
		var code string
		if err := rows2.Scan(&code); err != nil {
			return nil, fmt.Errorf("scan unlock: %w", err)
		}
		unlocked[code] = true
	}
	if err := rows2.Err(); err != nil {
		return nil, fmt.Errorf("unlock rows: %w", err)
	}

	newly := make([]Achievement, 0)
	for code, met := range conditions {
		if !met || unlocked[code] {
			continue
		}
		now := time.Now().Format(timeFormat)
		if _, err := s.db.Exec(
			`INSERT INTO user_achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)`,
			userID, code, now,
		); err != nil {
			return nil, fmt.Errorf("unlock %s: %w", code, err)
		}
		unlocked[code] = true
		achievement, err := s.achievementByCode(code)
		if err != nil {
			return nil, err
		}
		achievement.Unlocked = true
		achievement.UnlockedAt = &now
		newly = append(newly, *achievement)
	}
	return newly, nil
}

func (s *Store) achievementByCode(code string) (*Achievement, error) {
	var a Achievement
	err := s.db.QueryRow(
		`SELECT code, name, description, icon FROM achievements WHERE code = ?`, code,
	).Scan(&a.Code, &a.Name, &a.Description, &a.Icon)
	if err != nil {
		return nil, fmt.Errorf("query achievement %s: %w", code, err)
	}
	return &a, nil
}
