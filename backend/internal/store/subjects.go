package store

import (
	"database/sql"
	"errors"
	"fmt"
)

// Subject is a fixed catalog entry that sessions reference.
type Subject struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

// ListSubjects returns the fixed subject catalog in curated order.
func (s *Store) ListSubjects() ([]Subject, error) {
	rows, err := s.db.Query(`SELECT id, name, icon FROM subject_catalog ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list subjects: %w", err)
	}
	defer rows.Close()

	subs := make([]Subject, 0)
	for rows.Next() {
		var sub Subject
		if err := rows.Scan(&sub.ID, &sub.Name, &sub.Icon); err != nil {
			return nil, fmt.Errorf("scan subject: %w", err)
		}
		subs = append(subs, sub)
	}
	return subs, rows.Err()
}

// SubjectByID returns the catalog subject with the given ID, or ErrSubjectNotFound.
func (s *Store) SubjectByID(id int64) (*Subject, error) {
	sub := &Subject{}
	err := s.db.QueryRow(
		`SELECT id, name, icon FROM subject_catalog WHERE id = ?`, id,
	).Scan(&sub.ID, &sub.Name, &sub.Icon)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSubjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query subject: %w", err)
	}
	return sub, nil
}
