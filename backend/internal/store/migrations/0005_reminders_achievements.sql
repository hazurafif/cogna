-- 0005_reminders_achievements.sql
-- Adds reminder settings to the settings table and seeds the achievement
-- catalog with per-user unlock tracking.

ALTER TABLE settings ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN reminder_time TEXT NOT NULL DEFAULT '19:00';

CREATE TABLE achievements (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

INSERT INTO achievements (code, name, description, icon, sort_order) VALUES
  ('first_session', 'First session', 'Log your very first study session', 'zap', 1),
  ('streak_3', 'On a roll', 'Study 3 days in a row', 'flame', 2),
  ('streak_7', 'Week warrior', 'Study 7 days in a row', 'flame', 3),
  ('streak_30', 'Iron streak', 'Study 30 days in a row', 'flame', 4),
  ('total_10h', 'Double digits', 'Reach 10 hours of total study time', 'clock', 5),
  ('total_50h', 'Half century', 'Reach 50 hours of total study time', 'clock', 6),
  ('total_100h', 'Century', 'Reach 100 hours of total study time', 'trophy', 7),
  ('week_10h', 'Power week', 'Study 10 hours in a single week', 'calendar-check', 8),
  ('night_owl', 'Night owl', 'Log 5 sessions after 9 PM', 'moon', 9),
  ('all_subjects', 'Renaissance', 'Study in every subject', 'globe', 10);

CREATE TABLE user_achievements (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES achievements(code),
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, code)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
