package store

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"
)

// Session is a study session recorded for a user's subject.
type Session struct {
	ID              int64   `json:"id"`
	UserID          int64   `json:"user_id"`
	SubjectID       int64   `json:"subject_id"`
	SubjectName     string  `json:"subject_name"`
	SubjectIcon     string  `json:"subject_icon"`
	StartedAt       string  `json:"started_at"`
	EndedAt         string  `json:"ended_at"`
	DurationMinutes int64   `json:"duration_minutes"`
	Source          string  `json:"source"`
	Note            *string `json:"note"`
	CreatedAt       string  `json:"created_at"`
}

// ParseTimestamp parses a timestamp in either the local layout
// (2006-01-02T15:04:05) or RFC3339 with an offset.
func ParseTimestamp(s string) (time.Time, error) {
	for _, layout := range []string{timeFormat, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("parse timestamp %q", s)
}

func durationMinutes(startedAt, endedAt string) (int64, error) {
	start, err := ParseTimestamp(startedAt)
	if err != nil {
		return 0, fmt.Errorf("parse started_at: %w", err)
	}
	end, err := ParseTimestamp(endedAt)
	if err != nil {
		return 0, fmt.Errorf("parse ended_at: %w", err)
	}
	mins := int64(math.Round(end.Sub(start).Minutes()))
	if mins < 1 {
		mins = 1
	}
	return mins, nil
}

// CreateSession inserts a new session and returns it with its assigned ID, or
// ErrSubjectNotFound when the subject is not in the catalog.
func (s *Store) CreateSession(userID, subjectID int64, startedAt, endedAt, source string, note *string) (*Session, error) {
	if _, err := s.SubjectByID(subjectID); err != nil {
		if errors.Is(err, ErrSubjectNotFound) {
			return nil, ErrSubjectNotFound
		}
		return nil, fmt.Errorf("check subject: %w", err)
	}
	started, err := ParseTimestamp(startedAt)
	if err != nil {
		return nil, err
	}
	ended, err := ParseTimestamp(endedAt)
	if err != nil {
		return nil, err
	}
	startedAt = started.Format(timeFormat)
	endedAt = ended.Format(timeFormat)
	mins, err := durationMinutes(startedAt, endedAt)
	if err != nil {
		return nil, err
	}

	sess := &Session{
		UserID:          userID,
		SubjectID:       subjectID,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		DurationMinutes: mins,
		Source:          source,
		Note:            note,
		CreatedAt:       time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO sessions (user_id, subject_id, started_at, ended_at, duration_minutes, source, note, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sess.UserID, sess.SubjectID, sess.StartedAt, sess.EndedAt,
		sess.DurationMinutes, sess.Source, sess.Note, sess.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert session: %w", err)
	}
	sess.ID, _ = res.LastInsertId()
	return sess, nil
}

const sessionColumns = `s.id, s.user_id, s.subject_id, sub.name, sub.icon,
	s.started_at, s.ended_at, s.duration_minutes, s.source, s.note, s.created_at`
func (s *Store) scanSession(row interface{ Scan(...any) error }) (*Session, error) {
	var sess Session
	err := row.Scan(&sess.ID, &sess.UserID, &sess.SubjectID, &sess.SubjectName,
		&sess.SubjectIcon, &sess.StartedAt, &sess.EndedAt, &sess.DurationMinutes,
		&sess.Source, &sess.Note, &sess.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

// SessionByID returns the user's session with the given ID, or ErrNotFound.
func (s *Store) SessionByID(userID, id int64) (*Session, error) {
	sess, err := s.scanSession(s.db.QueryRow(
		`SELECT `+sessionColumns+` FROM sessions s
		 JOIN subject_catalog sub ON sub.id = s.subject_id
		 WHERE s.user_id = ? AND s.id = ?`, userID, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query session: %w", err)
	}
	return sess, nil
}

// SessionFilter narrows ListSessions results. Limit 0 means no limit.
type SessionFilter struct {
	UserID    int64
	From      string // inclusive date on started_at (YYYY-MM-DD)
	To        string // inclusive date on started_at (YYYY-MM-DD)
	SubjectID int64
	Q         string // matches note text or subject name (case-insensitive)
	Limit     int
	Offset    int
}

func (f SessionFilter) whereClause() (string, []any) {
	query := ` WHERE s.user_id = ?`
	args := []any{f.UserID}
	if f.From != "" {
		query += ` AND date(s.started_at) >= ?`
		args = append(args, f.From)
	}
	if f.To != "" {
		query += ` AND date(s.started_at) <= ?`
		args = append(args, f.To)
	}
	if f.SubjectID > 0 {
		query += ` AND s.subject_id = ?`
		args = append(args, f.SubjectID)
	}
	if f.Q != "" {
		query += ` AND (s.note LIKE ? OR sub.name LIKE ?)`
		pattern := "%" + f.Q + "%"
		args = append(args, pattern, pattern)
	}
	return query, args
}

// ListSessions returns the user's sessions ordered by started_at descending,
// matching the filter, along with the total number of matching sessions
// (before limit/offset).
func (s *Store) ListSessions(userID int64, f SessionFilter) ([]Session, int, error) {
	f.UserID = userID
	where, args := f.whereClause()

	var total int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM sessions s`+
		` JOIN subject_catalog sub ON sub.id = s.subject_id`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count sessions: %w", err)
	}

	query := `SELECT ` + sessionColumns + ` FROM sessions s` +
		` JOIN subject_catalog sub ON sub.id = s.subject_id` + where +
		` ORDER BY s.started_at DESC, s.id DESC`
	if f.Limit > 0 {
		query += ` LIMIT ? OFFSET ?`
		args = append(args, f.Limit, f.Offset)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]Session, 0)
	for rows.Next() {
		sess, err := s.scanSession(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, *sess)
	}
	return sessions, total, rows.Err()
}

// UpdateSession updates the user's session, or returns ErrNotFound, or
// ErrSubjectNotFound when the new subject is not in the catalog.
func (s *Store) UpdateSession(userID, id, subjectID int64, startedAt, endedAt string, note *string) (*Session, error) {
	if _, err := s.SubjectByID(subjectID); err != nil {
		if errors.Is(err, ErrSubjectNotFound) {
			return nil, ErrSubjectNotFound
		}
		return nil, fmt.Errorf("check subject: %w", err)
	}
	started, err := ParseTimestamp(startedAt)
	if err != nil {
		return nil, err
	}
	ended, err := ParseTimestamp(endedAt)
	if err != nil {
		return nil, err
	}
	startedAt = started.Format(timeFormat)
	endedAt = ended.Format(timeFormat)
	mins, err := durationMinutes(startedAt, endedAt)
	if err != nil {
		return nil, err
	}

	res, err := s.db.Exec(
		`UPDATE sessions SET subject_id = ?, started_at = ?, ended_at = ?, duration_minutes = ?, note = ?
		 WHERE user_id = ? AND id = ?`,
		subjectID, startedAt, endedAt, mins, note, userID, id,
	)
	if err != nil {
		return nil, fmt.Errorf("update session: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.SessionByID(userID, id)
}

// DeleteSession removes the user's session, or returns ErrNotFound.
func (s *Store) DeleteSession(userID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM sessions WHERE user_id = ? AND id = ?`, userID, id)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
