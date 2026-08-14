-- 0004_settings.sql
-- Adds a display name to users and a per-user settings row for study goals.

ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';

CREATE TABLE settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 120,
  weekly_goal_minutes INTEGER NOT NULL DEFAULT 840,
  updated_at TEXT NOT NULL
);
