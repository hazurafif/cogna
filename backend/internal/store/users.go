package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"modernc.org/sqlite"
)

// User is a registered account.
type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	PasswordHash string `json:"-"`
	CreatedAt    string `json:"created_at"`
}

const userColumns = `id, email, name, password_hash, created_at`

func (s *Store) scanUser(row interface{ Scan(...any) error }) (*User, error) {
	user := &User{}
	err := row.Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// CreateUser inserts a new user and returns it with its assigned ID.
func (s *Store) CreateUser(email, passwordHash string) (*User, error) {
	user := &User{
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().Format(timeFormat),
	}
	res, err := s.db.Exec(
		`INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)`,
		user.Email, user.Name, user.PasswordHash, user.CreatedAt,
	)
	if err != nil {
		var sqliteErr *sqlite.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code() == 2067 { // SQLITE_CONSTRAINT_UNIQUE
			return nil, ErrDuplicateEmail
		}
		return nil, fmt.Errorf("insert user: %w", err)
	}
	user.ID, _ = res.LastInsertId()
	return user, nil
}

// UserByEmail returns the user with the given email, or ErrNotFound.
func (s *Store) UserByEmail(email string) (*User, error) {
	user, err := s.scanUser(s.db.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE email = ?`, email))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	return user, nil
}

// UserByID returns the user with the given ID, or ErrNotFound.
func (s *Store) UserByID(id int64) (*User, error) {
	user, err := s.scanUser(s.db.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	return user, nil
}

// UpdateUserName sets the user's display name and returns the updated user,
// or ErrNotFound.
func (s *Store) UpdateUserName(userID int64, name string) (*User, error) {
	res, err := s.db.Exec(`UPDATE users SET name = ? WHERE id = ?`, name, userID)
	if err != nil {
		return nil, fmt.Errorf("update user name: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.UserByID(userID)
}
