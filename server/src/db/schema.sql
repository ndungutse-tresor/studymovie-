-- StudyReel schema (PostgreSQL).
--
-- Timestamps are `timestamptz` throughout, so the driver hands back real Date
-- objects and daylight-saving arithmetic is the database's problem, not ours.
-- Flag columns stay INTEGER 0/1 rather than BOOLEAN to keep one representation
-- across the API surface.

-- ---------------------------------------------------------------------------
-- Admissions: a prospective learner applies first, and only an approved
-- application can be converted into an account.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                TEXT PRIMARY KEY,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT,
  country           TEXT,
  track             TEXT NOT NULL,
  experience_level  TEXT NOT NULL CHECK (experience_level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  weekly_hours      INTEGER NOT NULL DEFAULT 5,
  motivation        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','ENROLLED')),
  access_code       TEXT UNIQUE,
  review_note       TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  application_id  TEXT REFERENCES applications(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'LEARNER' CHECK (role IN ('LEARNER','ADMIN')),
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  summary        TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  level          TEXT NOT NULL CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  duration_hours DOUBLE PRECISION NOT NULL DEFAULT 6,
  accent         TEXT NOT NULL DEFAULT 'slate',
  outcomes       TEXT NOT NULL DEFAULT '[]',
  prerequisites  TEXT NOT NULL DEFAULT '[]',
  position       INTEGER NOT NULL DEFAULT 0,
  published      INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  content           TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 25,
  pass_mark         INTEGER NOT NULL DEFAULT 70,
  reward_minutes    INTEGER NOT NULL DEFAULT 30,
  UNIQUE (course_id, position)
);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id, position);

CREATE TABLE IF NOT EXISTS questions (
  id            TEXT PRIMARY KEY,
  chapter_id    TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  prompt        TEXT NOT NULL,
  options       TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation   TEXT NOT NULL DEFAULT '',
  UNIQUE (chapter_id, position)
);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id, position);

CREATE TABLE IF NOT EXISTS chapter_resources (
  id             TEXT PRIMARY KEY,
  chapter_id     TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  file_name      TEXT NOT NULL,
  resource_url   TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  size_bytes     BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, position)
);
CREATE INDEX IF NOT EXISTS idx_chapter_resources_chapter ON chapter_resources(chapter_id, position);

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','PAUSED')),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS chapter_progress (
  id                TEXT PRIMARY KEY,
  enrollment_id     TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  chapter_id        TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  state             TEXT NOT NULL DEFAULT 'LOCKED'
                      CHECK (state IN ('LOCKED','AVAILABLE','STUDYING','EXAM_READY','REWARD_READY','REWARD_ACTIVE','COMPLETED')),
  study_started_at  TIMESTAMPTZ,
  study_seconds     INTEGER NOT NULL DEFAULT 0,
  attempts          INTEGER NOT NULL DEFAULT 0,
  best_score        INTEGER NOT NULL DEFAULT 0,
  passed_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cooldown_until    TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_enrollment ON chapter_progress(enrollment_id);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id     TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ NOT NULL,
  score          INTEGER,
  pass_mark      INTEGER NOT NULL,
  passed         INTEGER,
  answers        TEXT NOT NULL DEFAULT '{}',
  question_order TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_chapter ON exam_attempts(user_id, chapter_id);

-- A reward session is the only way a movie can be watched from coursework.
-- The server owns the clock: expires_at is set at grant time and is never
-- extended by the client.
CREATE TABLE IF NOT EXISTS reward_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id       TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  attempt_id       TEXT REFERENCES exam_attempts(id) ON DELETE SET NULL,
  minutes_granted  INTEGER NOT NULL,
  movie_id         TEXT,
  movie_title      TEXT,
  movie_source     TEXT,
  movie_stream_url TEXT,
  movie_poster     TEXT,
  status           TEXT NOT NULL DEFAULT 'GRANTED'
                     CHECK (status IN ('GRANTED','ACTIVE','EXPIRED','ENDED','FORFEITED')),
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at       TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  seconds_watched  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reward_sessions_user ON reward_sessions(user_id, status);

-- ---------------------------------------------------------------------------
-- Schedule and movie preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_schedules (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        TEXT REFERENCES courses(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  reminder_minutes INTEGER NOT NULL DEFAULT 10,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON study_schedules(user_id, day_of_week);

CREATE TABLE IF NOT EXISTS schedule_alerts (
  id              TEXT PRIMARY KEY,
  schedule_id     TEXT NOT NULL REFERENCES study_schedules(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurrence      TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, occurrence)
);

-- Free-time viewing: a learner either saves a title for later or declines it,
-- and declined titles stop being recommended.
CREATE TABLE IF NOT EXISTS movie_preferences (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id    TEXT NOT NULL,
  decision    TEXT NOT NULL CHECK (decision IN ('WATCH_LATER','DECLINED','WATCHED')),
  title       TEXT NOT NULL,
  poster_url  TEXT,
  source      TEXT,
  year        INTEGER,
  payload     TEXT NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_preferences_user ON movie_preferences(user_id, decision);

CREATE TABLE IF NOT EXISTS movie_cache (
  cache_key  TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- The film library: provider imports and admin-managed titles. Browsing reads
-- from here, so a page view never waits on an upstream provider.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movie_library (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  title           TEXT NOT NULL,
  year            INTEGER,
  synopsis        TEXT NOT NULL DEFAULT '',
  genres          TEXT[] NOT NULL DEFAULT '{}',
  runtime_minutes INTEGER,
  poster_url      TEXT,
  source_url      TEXT,
  stream_url      TEXT,
  embed_url       TEXT,
  popularity      INTEGER NOT NULL DEFAULT 0,
  rating          REAL,
  licence         TEXT NOT NULL DEFAULT '',
  -- When the source published it, as opposed to when StudyReel first saw it.
  added_at        TIMESTAMPTZ,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movie_library_popularity ON movie_library(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movie_library_added ON movie_library(added_at DESC NULLS LAST);

-- The outcome of the most recent sync for each source.
CREATE TABLE IF NOT EXISTS movie_sources (
  name       TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('ok', 'unavailable', 'disabled')),
  item_count INTEGER NOT NULL DEFAULT 0,
  added      INTEGER NOT NULL DEFAULT 0,
  detail     TEXT,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The API connects as the table owner and bypasses RLS; enabling it with no
-- policies keeps these tables closed to Supabase's public Data API.
ALTER TABLE movie_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
