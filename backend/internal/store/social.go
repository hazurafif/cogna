package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// PublicUser is a user as shown to other users (no password material).
type PublicUser struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

// UserFollow is a search result or followee with follow state and the
// user's study minutes in the current week.
type UserFollow struct {
	PublicUser
	IsFollowing  bool  `json:"is_following"`
	WeeklyMinutes int64 `json:"weekly_minutes"`
}

// ErrUserNotFound is returned when a target user does not exist.
var ErrUserNotFound = errors.New("user not found")

func (s *Store) scanPublicUser(row interface{ Scan(...any) error }) (*PublicUser, error) {
	u := &PublicUser{}
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// SearchUsers finds users by email substring, excluding the caller, and
// reports whether the caller already follows each result.
func (s *Store) SearchUsers(userID int64, q string) ([]UserFollow, error) {
	rows, err := s.db.Query(
		`SELECT u.id, u.email, u.name, u.created_at,
		        EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id)
		 FROM users u
		 WHERE u.id != ? AND lower(u.email) LIKE ?
		 ORDER BY u.email
		 LIMIT 10`,
		userID, userID, "%"+q+"%",
	)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	users := make([]UserFollow, 0)
	for rows.Next() {
		var u UserFollow
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.IsFollowing); err != nil {
			return nil, fmt.Errorf("scan search user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// Follow makes userID follow targetID. It returns ErrUserNotFound when the
// target does not exist; following an already-followed user is a no-op.
func (s *Store) Follow(userID, targetID int64) error {
	if err := s.ensureUser(targetID); err != nil {
		return err
	}
	if userID == targetID {
		return nil
	}
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)`,
		userID, targetID, time.Now().Format(timeFormat),
	)
	if err != nil {
		return fmt.Errorf("insert follow: %w", err)
	}
	return nil
}

// Unfollow removes the follow edge; missing edges are a no-op.
func (s *Store) Unfollow(userID, targetID int64) error {
	_, err := s.db.Exec(
		`DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, userID, targetID)
	if err != nil {
		return fmt.Errorf("delete follow: %w", err)
	}
	return nil
}

func (s *Store) ensureUser(id int64) error {
	var one int
	err := s.db.QueryRow(`SELECT 1 FROM users WHERE id = ?`, id).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("check user: %w", err)
	}
	return nil
}

// Following lists the users the caller follows, with each one's minutes in
// the current week.
func (s *Store) Following(userID int64, now time.Time) ([]UserFollow, error) {
	weekStart := startOfWeek(now).Format("2006-01-02")
	weekEnd := startOfWeek(now).AddDate(0, 0, 7).Format("2006-01-02")
	rows, err := s.db.Query(
		`SELECT u.id, u.email, u.name, u.created_at,
		        COALESCE((SELECT SUM(sess.duration_minutes) FROM sessions sess
		                  WHERE sess.user_id = u.id
		                    AND date(sess.started_at) >= ? AND date(sess.started_at) < ?), 0)
		 FROM follows f JOIN users u ON u.id = f.followee_id
		 WHERE f.follower_id = ?
		 ORDER BY u.email`,
		weekStart, weekEnd, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list following: %w", err)
	}
	defer rows.Close()

	users := make([]UserFollow, 0)
	for rows.Next() {
		var u UserFollow
		u.IsFollowing = true
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt, &u.WeeklyMinutes); err != nil {
			return nil, fmt.Errorf("scan following: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// FeedItem is a session in the activity feed with its author and kudos.
type FeedItem struct {
	Session    Session    `json:"session"`
	User       PublicUser `json:"user"`
	KudosCount int64      `json:"kudos_count"`
	KudosByMe  bool       `json:"kudos_by_me"`
}

// Feed returns the caller's sessions plus sessions from followed users,
// newest first.
func (s *Store) Feed(userID int64, limit, offset int) ([]FeedItem, error) {
	query := `SELECT ` + sessionColumns + `,
	        u.id, u.email, u.name, u.created_at,
	        (SELECT COUNT(*) FROM kudos k WHERE k.session_id = s.id),
	        EXISTS(SELECT 1 FROM kudos k2 WHERE k2.session_id = s.id AND k2.user_id = ?)
		 FROM sessions s
		 JOIN subject_catalog sub ON sub.id = s.subject_id
		 JOIN users u ON u.id = s.user_id
		 WHERE s.user_id = ? OR s.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?)
		 ORDER BY s.started_at DESC, s.id DESC
		 LIMIT ? OFFSET ?`
	rows, err := s.db.Query(query, userID, userID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("feed: %w", err)
	}
	defer rows.Close()

	items := make([]FeedItem, 0)
	for rows.Next() {
		var item FeedItem
		err := rows.Scan(&item.Session.ID, &item.Session.UserID, &item.Session.SubjectID,
			&item.Session.SubjectName, &item.Session.SubjectIcon, &item.Session.StartedAt,
			&item.Session.EndedAt, &item.Session.DurationMinutes, &item.Session.Source,
			&item.Session.Note, &item.Session.CreatedAt,
			&item.User.ID, &item.User.Email, &item.User.Name, &item.User.CreatedAt,
			&item.KudosCount, &item.KudosByMe)
		if err != nil {
			return nil, fmt.Errorf("scan feed item: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// AddKudos kudos a session. It returns ErrNotFound when the session does not
// exist and ErrSelfKudos when the session belongs to the caller.
func (s *Store) AddKudos(userID, sessionID int64) error {
	owner, err := s.sessionOwner(sessionID)
	if err != nil {
		return err
	}
	if owner == userID {
		return ErrSelfKudos
	}
	_, err = s.db.Exec(
		`INSERT OR IGNORE INTO kudos (user_id, session_id, created_at) VALUES (?, ?, ?)`,
		userID, sessionID, time.Now().Format(timeFormat),
	)
	if err != nil {
		return fmt.Errorf("insert kudos: %w", err)
	}
	return nil
}

// RemoveKudos removes the caller's kudos from a session.
func (s *Store) RemoveKudos(userID, sessionID int64) error {
	_, err := s.db.Exec(
		`DELETE FROM kudos WHERE user_id = ? AND session_id = ?`, userID, sessionID)
	if err != nil {
		return fmt.Errorf("delete kudos: %w", err)
	}
	return nil
}

// ErrSelfKudos is returned when a user tries to kudos their own session.
var ErrSelfKudos = errors.New("cannot kudos own session")

func (s *Store) sessionOwner(sessionID int64) (int64, error) {
	var owner int64
	err := s.db.QueryRow(`SELECT user_id FROM sessions WHERE id = ?`, sessionID).Scan(&owner)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("query session owner: %w", err)
	}
	return owner, nil
}

// LeaderboardEntry is one row of the friend leaderboard.
type LeaderboardEntry struct {
	PublicUser
	Minutes int64 `json:"minutes"`
	IsSelf  bool  `json:"is_self"`
}

// FriendLeaderboard ranks the caller and the users they follow by study
// minutes in the current week, best first.
func (s *Store) FriendLeaderboard(userID int64, now time.Time) ([]LeaderboardEntry, error) {
	weekStart := startOfWeek(now).Format("2006-01-02")
	weekEnd := startOfWeek(now).AddDate(0, 0, 7).Format("2006-01-02")
	rows, err := s.db.Query(
		`SELECT u.id, u.email, u.name, u.created_at,
		        COALESCE(SUM(sess.duration_minutes), 0),
		        (u.id = ?)
		 FROM users u
		 LEFT JOIN sessions sess ON sess.user_id = u.id
		   AND date(sess.started_at) >= ? AND date(sess.started_at) < ?
		 LEFT JOIN follows f ON f.follower_id = ? AND f.followee_id = u.id
		 WHERE u.id = ? OR f.follower_id = ?
		 GROUP BY u.id, u.email, u.name, u.created_at
		 ORDER BY SUM(sess.duration_minutes) DESC, u.email ASC`,
		userID, weekStart, weekEnd, userID, userID, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("leaderboard: %w", err)
	}
	defer rows.Close()

	entries := make([]LeaderboardEntry, 0)
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.ID, &e.Email, &e.Name, &e.CreatedAt, &e.Minutes, &e.IsSelf); err != nil {
			return nil, fmt.Errorf("scan leaderboard: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
