package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"modernc.org/sqlite"
)

// Subject is a study subject owned by a user.
type Subject struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"user_id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
}

// CreateSubject inserts a new subject and returns it with its assigned ID.
func (s *Store) CreateSubject(userID int64, name, color string) (*Subject, error) {
	sub := &Subject{
		UserID:    userID,
		Name:      name,
		Color:     color,
		CreatedAt: time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO subjects (user_id, name, color, created_at) VALUES (?, ?, ?, ?)`,
		sub.UserID, sub.Name, sub.Color, sub.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert subject: %w", err)
	}
	sub.ID, _ = res.LastInsertId()
	return sub, nil
}

// ListSubjects returns the user's subjects ordered by name.
func (s *Store) ListSubjects(userID int64) ([]Subject, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, name, color, created_at FROM subjects WHERE user_id = ? ORDER BY name`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list subjects: %w", err)
	}
	defer rows.Close()

	subs := make([]Subject, 0)
	for rows.Next() {
		var sub Subject
		if err := rows.Scan(&sub.ID, &sub.UserID, &sub.Name, &sub.Color, &sub.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan subject: %w", err)
		}
		subs = append(subs, sub)
	}
	return subs, rows.Err()
}

// SubjectByID returns the user's subject with the given ID, or ErrSubjectNotFound.
func (s *Store) SubjectByID(userID, id int64) (*Subject, error) {
	sub := &Subject{}
	err := s.db.QueryRow(
		`SELECT id, user_id, name, color, created_at FROM subjects WHERE user_id = ? AND id = ?`,
		userID, id,
	).Scan(&sub.ID, &sub.UserID, &sub.Name, &sub.Color, &sub.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSubjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query subject: %w", err)
	}
	return sub, nil
}

// UpdateSubject renames and recolors the user's subject, or returns ErrNotFound.
func (s *Store) UpdateSubject(userID, id int64, name, color string) (*Subject, error) {
	res, err := s.db.Exec(
		`UPDATE subjects SET name = ?, color = ? WHERE user_id = ? AND id = ?`,
		name, color, userID, id,
	)
	if err != nil {
		return nil, fmt.Errorf("update subject: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.SubjectByID(userID, id)
}

// DeleteSubject removes the user's subject, or returns ErrNotFound, or
// ErrSubjectInUse when sessions still reference it.
func (s *Store) DeleteSubject(userID, id int64) error {
	res, err := s.db.Exec(`DELETE FROM subjects WHERE user_id = ? AND id = ?`, userID, id)
	if err != nil {
		var sqliteErr *sqlite.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code() == 787 { // SQLITE_CONSTRAINT_FOREIGNKEY
			return ErrSubjectInUse
		}
		return fmt.Errorf("delete subject: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
