-- 0003_subject_catalog.sql
-- Replaces per-user subjects with a fixed global catalog. Sessions are
-- rebuilt to reference catalog ids; existing user subjects map by name
-- (case-insensitive) with a fallback to 'other'.

CREATE TABLE subject_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL
);

INSERT INTO subject_catalog (name, icon) VALUES
  ('math', 'calculator'),
  ('science', 'flask-conical'),
  ('language', 'languages'),
  ('programming', 'code'),
  ('reading', 'book-open'),
  ('writing', 'pen-tool'),
  ('history', 'landmark'),
  ('music', 'music'),
  ('art', 'palette'),
  ('test-prep', 'graduation-cap'),
  ('other', 'brain');

ALTER TABLE sessions RENAME TO sessions_old;

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER NOT NULL REFERENCES subject_catalog(id),
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('timer', 'manual')),
  note TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO sessions (id, user_id, subject_id, started_at, ended_at, duration_minutes, source, note, created_at)
  SELECT s.id, s.user_id,
    COALESCE(
      (SELECT c.id FROM subject_catalog c JOIN subjects sub ON lower(sub.name) = lower(c.name) WHERE sub.id = s.subject_id),
      (SELECT id FROM subject_catalog WHERE name = 'other')
    ),
    s.started_at, s.ended_at, s.duration_minutes, s.source, s.note, s.created_at
  FROM sessions_old s;

DROP TABLE sessions_old;

DROP TABLE subjects;

CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);
