-- ════════════════════════════════════════════════════════════════════════════
--  VYLAPP — LEARN PILLAR SCHEMA  (migration: learn_pillar_v1)
--
--  DESIGN DECISIONS:
--  1. Lessons are a distinct content type from vibes. A vibe is ephemeral
--     social content. A lesson is structured, versioned, sequenced educational
--     content with checkpoints and completion tracking.
--  2. Educators are a separate role from creators. A creator monetises via
--     subscriptions and Super Vibes. An educator monetises via course enrolment.
--  3. Learning paths are curated sequences of courses — they can span multiple
--     educators and multiple topics.
--  4. Progress is tracked at the lesson level, not just the course level.
--     This enables partial completion, resume, and offline progress sync.
--  5. Certificates are content-hashed — the hash is the certificate ID.
--     This makes them independently verifiable without a central lookup.
--  6. All tables include language columns to support the translation moat.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE lesson_type AS ENUM ('video', 'article', 'quiz', 'live_session', 'interactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE educator_status AS ENUM ('pending', 'community', 'verified', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrolment_status AS ENUM ('active', 'completed', 'dropped', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Educator profiles ─────────────────────────────────────────────────────────
-- Distinct from creator profiles. Educators teach structured content.
-- Community educators: peer teachers, no credentials required.
-- Verified educators: credential-verified by Vylapp team.
CREATE TABLE IF NOT EXISTS educator_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio               TEXT,
  credentials       JSONB NOT NULL DEFAULT '[]',       -- [{type, institution, year, verified}]
  subjects          TEXT[] NOT NULL DEFAULT '{}',
  languages_taught  TEXT[] NOT NULL DEFAULT '{"en"}',  -- ISO 639-1 language codes
  status            educator_status NOT NULL DEFAULT 'community',
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES users(id),
  total_students    INT NOT NULL DEFAULT 0,
  total_courses     INT NOT NULL DEFAULT 0,
  avg_rating        NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_educator_profiles_user    ON educator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_educator_profiles_status  ON educator_profiles(status);
CREATE INDEX IF NOT EXISTS idx_educator_profiles_subjects ON educator_profiles USING GIN(subjects);

-- ── Courses ───────────────────────────────────────────────────────────────────
-- The top-level learning container. A course has an ordered list of lessons.
CREATE TABLE IF NOT EXISTS courses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  educator_id      UUID NOT NULL REFERENCES educator_profiles(id) ON DELETE RESTRICT,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description      TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  category         TEXT NOT NULL,                    -- matches existing topic categories
  language         TEXT NOT NULL DEFAULT 'en',       -- primary language of content
  difficulty       TEXT NOT NULL DEFAULT 'beginner'  -- beginner|intermediate|advanced
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status           course_status NOT NULL DEFAULT 'draft',
  is_free          BOOLEAN NOT NULL DEFAULT TRUE,
  price_usd        NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  cover_image_url  TEXT,
  preview_video_url TEXT,
  estimated_hours  NUMERIC(4,1),
  tags             TEXT[] NOT NULL DEFAULT '{}',
  enrolment_count  INT NOT NULL DEFAULT 0,
  total_lessons    INT NOT NULL DEFAULT 0,
  avg_rating       NUMERIC(3,2) NOT NULL DEFAULT 0,
  stripe_product_id TEXT,                             -- null for free courses
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_educator    ON courses(educator_id);
CREATE INDEX IF NOT EXISTS idx_courses_category    ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_status      ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_language    ON courses(language);
CREATE INDEX IF NOT EXISTS idx_courses_is_free     ON courses(is_free);
CREATE INDEX IF NOT EXISTS idx_courses_tags        ON courses USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_courses_fulltext    ON courses USING GIN(to_tsvector('english', title || ' ' || description));

-- ── Lessons ───────────────────────────────────────────────────────────────────
-- Individual learning units within a course.
-- Versioned: content_version increments on each content update so learners
-- in progress see which version they were on.
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description      TEXT,
  type             lesson_type NOT NULL,
  content          JSONB NOT NULL DEFAULT '{}',       -- type-specific content payload
  -- video:   {video_url, duration_seconds, transcript_url, captions_url}
  -- article: {body_html, read_time_minutes}
  -- quiz:    {instructions, time_limit_minutes}
  -- live:    {space_id, scheduled_at}
  sort_order       INT NOT NULL DEFAULT 0,            -- lesson sequence in the course
  is_free_preview  BOOLEAN NOT NULL DEFAULT FALSE,    -- true = visible without enrolment
  language         TEXT NOT NULL DEFAULT 'en',
  duration_minutes INT,
  content_version  INT NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course     ON lessons(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_type       ON lessons(type);

-- ── Knowledge checkpoints ─────────────────────────────────────────────────────
-- Quizzes embedded within or after lessons.
-- Multilingual: each checkpoint has a language column.
CREATE TABLE IF NOT EXISTS knowledge_checkpoints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question        TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 1000),
  options         JSONB NOT NULL,                     -- [{id, text}] — minimum 2
  correct_option  TEXT NOT NULL,                      -- must match an option id
  explanation     TEXT,                               -- shown after answering
  points          INT NOT NULL DEFAULT 10,
  language        TEXT NOT NULL DEFAULT 'en',
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_lesson ON knowledge_checkpoints(lesson_id, sort_order);

-- ── Lesson completions ────────────────────────────────────────────────────────
-- Tracks per-user, per-lesson progress. One row per user per lesson.
-- score: 0-100 for quizzes, NULL for non-quiz lessons.
CREATE TABLE IF NOT EXISTS lesson_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  score           INT CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  time_spent_sec  INT NOT NULL DEFAULT 0,
  content_version INT NOT NULL DEFAULT 1,             -- tracks which version was completed
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_completions_user       ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_course     ON lesson_completions(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_completions_completed  ON lesson_completions(completed_at) WHERE completed_at IS NOT NULL;

-- ── Checkpoint responses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkpoint_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkpoint_id   UUID NOT NULL REFERENCES knowledge_checkpoints(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  points_earned   INT NOT NULL DEFAULT 0,
  responded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_responses_user       ON checkpoint_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_checkpoint ON checkpoint_responses(checkpoint_id);

-- ── Course enrolments ─────────────────────────────────────────────────────────
-- Tracks which users are enrolled in which courses.
CREATE TABLE IF NOT EXISTS course_enrolments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status          enrolment_status NOT NULL DEFAULT 'active',
  progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  lessons_done    INT NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,                      -- null for free courses
  amount_paid_usd NUMERIC(8,2) NOT NULL DEFAULT 0,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,                        -- null = no expiry (most courses)
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrolments_user   ON course_enrolments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_enrolments_course ON course_enrolments(course_id, status);

-- ── Learning paths ────────────────────────────────────────────────────────────
-- Curated sequences of courses. Can span multiple educators.
CREATE TABLE IF NOT EXISTS learning_paths (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'en',
  difficulty      TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  is_official     BOOLEAN NOT NULL DEFAULT FALSE,     -- curated by Vylapp team
  course_count    INT NOT NULL DEFAULT 0,
  enrolment_count INT NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(5,1),
  cover_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paths_creator  ON learning_paths(creator_id);
CREATE INDEX IF NOT EXISTS idx_paths_category ON learning_paths(category);
CREATE INDEX IF NOT EXISTS idx_paths_official ON learning_paths(is_official);

-- ── Path courses ──────────────────────────────────────────────────────────────
-- Ordered courses within a learning path.
CREATE TABLE IF NOT EXISTS path_courses (
  path_id     UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (path_id, course_id)
);

-- ── Path enrolments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS path_enrolments (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id     UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_path_enrolments_user ON path_enrolments(user_id);

-- ── Course ratings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT CHECK (char_length(review) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_course ON course_ratings(course_id);

-- ── Learning streaks ──────────────────────────────────────────────────────────
-- Tracked per user. Updated by a trigger on lesson_completions.
CREATE TABLE IF NOT EXISTS learning_streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INT NOT NULL DEFAULT 0,
  longest_streak    INT NOT NULL DEFAULT 0,
  last_activity_at  TIMESTAMPTZ,
  streak_frozen_at  TIMESTAMPTZ,    -- allows a 24h grace period if user misses a day
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Certificates ──────────────────────────────────────────────────────────────
-- Content-hashed: the certificate ID is derived from (user_id, course_id, completed_at).
-- This makes certificates independently verifiable without a central lookup.
CREATE TABLE IF NOT EXISTS certificates (
  id              TEXT PRIMARY KEY,           -- SHA-256 hash of (user_id+course_id+completed_at)
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  course_title    TEXT NOT NULL,              -- snapshot at time of issue
  educator_name   TEXT NOT NULL,              -- snapshot at time of issue
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,               -- null = valid
  revoke_reason   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────
-- Update enrolment progress when a lesson is completed.
CREATE OR REPLACE FUNCTION fn_update_enrolment_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total INT;
  v_done  INT;
  v_pct   INT;
BEGIN
  SELECT total_lessons INTO v_total FROM courses WHERE id = NEW.course_id;
  SELECT COUNT(*) INTO v_done FROM lesson_completions
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id AND completed_at IS NOT NULL;
  v_pct := CASE WHEN v_total > 0 THEN LEAST(100, ROUND((v_done::NUMERIC / v_total) * 100)) ELSE 0 END;

  UPDATE course_enrolments
    SET progress_pct  = v_pct,
        lessons_done  = v_done,
        completed_at  = CASE WHEN v_pct = 100 AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        status        = CASE WHEN v_pct = 100 THEN 'completed' ELSE status END
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_enrolment_progress ON lesson_completions;
CREATE TRIGGER trg_update_enrolment_progress
  AFTER INSERT OR UPDATE ON lesson_completions
  FOR EACH ROW EXECUTE FUNCTION fn_update_enrolment_progress();

-- Update course enrolment_count when a user enrols.
CREATE OR REPLACE FUNCTION fn_update_course_enrolment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses SET enrolment_count = enrolment_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses SET enrolment_count = GREATEST(0, enrolment_count - 1) WHERE id = OLD.course_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_enrolment_count ON course_enrolments;
CREATE TRIGGER trg_course_enrolment_count
  AFTER INSERT OR DELETE ON course_enrolments
  FOR EACH ROW EXECUTE FUNCTION fn_update_course_enrolment_count();

-- Update educator total_students when a student enrols.
CREATE OR REPLACE FUNCTION fn_update_educator_student_count()
RETURNS TRIGGER AS $$
DECLARE v_educator UUID;
BEGIN
  SELECT ep.id INTO v_educator FROM courses c JOIN educator_profiles ep ON ep.id = c.educator_id WHERE c.id = COALESCE(NEW.course_id, OLD.course_id);
  IF v_educator IS NOT NULL THEN
    UPDATE educator_profiles SET total_students = (
      SELECT COUNT(DISTINCT ce.user_id) FROM course_enrolments ce JOIN courses c ON c.id = ce.course_id WHERE c.educator_id = v_educator
    ) WHERE id = v_educator;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_educator_student_count ON course_enrolments;
CREATE TRIGGER trg_educator_student_count
  AFTER INSERT OR DELETE ON course_enrolments
  FOR EACH ROW EXECUTE FUNCTION fn_update_educator_student_count();

-- Update course avg_rating when a rating is added/updated.
CREATE OR REPLACE FUNCTION fn_update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses SET avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM course_ratings WHERE course_id = COALESCE(NEW.course_id, OLD.course_id))
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_avg_rating ON course_ratings;
CREATE TRIGGER trg_course_avg_rating
  AFTER INSERT OR UPDATE OR DELETE ON course_ratings
  FOR EACH ROW EXECUTE FUNCTION fn_update_course_rating();
