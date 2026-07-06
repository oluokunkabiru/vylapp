-- ════════════════════════════════════════════════════════════════════════════
--  VYLAPP — FORUM ARCHITECTURE SCHEMA  (migration: forum_v1)
--
--  DESIGN DECISIONS:
--  1. Forum threads are NOT vibes. They are persistent, searchable, threaded
--     discussions. The vibes table handles ephemeral social content. The
--     forum_threads table handles structured community knowledge.
--  2. Replies are threaded but depth-limited to 3 levels. Deeper nesting
--     produces unusable UIs on mobile — and the target market is mobile-first.
--  3. Votes are separated from vibe likes. Forum votes use ±1 (upvote/downvote)
--     and affect content ranking. Vibe likes are engagement signals only.
--  4. Community moderators are separate from platform admins. Each topic
--     community can have up to 5 moderators nominated by members.
--  5. Forum posts must pass through the ModerationEngine before being visible.
--     Pending posts are shown as placeholders to the author but not to others.
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE thread_status AS ENUM ('pending', 'active', 'locked', 'archived', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forum_mod_role AS ENUM ('moderator', 'senior_moderator', 'community_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vote_value AS ENUM ('up', 'down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Forum categories ──────────────────────────────────────────────────────────
-- Maps to existing topic communities (TECH_VIBES, GLOBAL_CONNECT, etc.)
-- but adds sub-categories for structured discussion.
CREATE TABLE IF NOT EXISTS forum_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,                -- URL-safe identifier
  name            TEXT NOT NULL,
  description     TEXT,
  parent_id       UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
  topic_category  TEXT,                                -- links to existing topic categories
  color           TEXT,                                -- hex color for UI
  icon            TEXT,                                -- emoji or icon name
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  thread_count    INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_cats_parent ON forum_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_cats_topic  ON forum_categories(topic_category);

-- Seed the base categories
INSERT INTO forum_categories (slug, name, description, topic_category, color, icon, sort_order) VALUES
  ('tech-vibes',      'Tech Vibes',       'DAOs, AI, Web3, and building in public',        'TECH_VIBES',      '#38BDF8', '⚡', 1),
  ('global-connect',  'Global Connect',   'AgriTech, diaspora, cross-border community',     'GLOBAL_CONNECT',  '#10F5A0', '🌍', 2),
  ('creative-learn',  'Creative Learn',   'Art, music, design, and creative education',     'CREATIVE_LEARN',  '#FFB830', '🎨', 3),
  ('human-potential', 'Human Potential',  'Learning systems, accountability, second brain', 'HUMAN_POTENTIAL', '#A78BFA', '🧠', 4),
  ('spaces-corner',   'Spaces Corner',    'Space announcements, replays, and discussions',  'SPACES_INVITE',   '#FF6B6B', '🎙️', 5),
  ('help-support',    'Help & Support',   'Questions, bugs, feature requests',              NULL,              '#4A4870', '💬', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── Forum threads ─────────────────────────────────────────────────────────────
-- Each thread is a discussion started by a user in a category.
CREATE TABLE IF NOT EXISTS forum_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID NOT NULL REFERENCES forum_categories(id) ON DELETE RESTRICT,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 300),
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 50000),
  language        TEXT NOT NULL DEFAULT 'en',
  status          thread_status NOT NULL DEFAULT 'pending',  -- pending → active on moderation pass
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  is_announcement BOOLEAN NOT NULL DEFAULT FALSE,
  view_count      INT NOT NULL DEFAULT 0,
  reply_count     INT NOT NULL DEFAULT 0,
  vote_score      INT NOT NULL DEFAULT 0,             -- sum of all votes on thread + direct replies
  last_reply_at   TIMESTAMPTZ,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  moderation_note TEXT,                               -- internal note from moderator
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_category   ON forum_threads(category_id, status, is_pinned DESC, last_reply_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_threads_author     ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_threads_status     ON forum_threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_pinned     ON forum_threads(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_threads_tags       ON forum_threads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_threads_fulltext   ON forum_threads USING GIN(to_tsvector('english', title || ' ' || body));
CREATE INDEX IF NOT EXISTS idx_threads_vote_score ON forum_threads(vote_score DESC);

-- ── Thread replies ────────────────────────────────────────────────────────────
-- Threaded up to depth 3. parent_reply_id NULL = direct reply to thread.
CREATE TABLE IF NOT EXISTS thread_replies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id       UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES thread_replies(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  language        TEXT NOT NULL DEFAULT 'en',
  depth           INT NOT NULL DEFAULT 0 CHECK (depth <= 3),  -- enforced at application layer too
  vote_score      INT NOT NULL DEFAULT 0,
  is_accepted     BOOLEAN NOT NULL DEFAULT FALSE,     -- author can mark one reply as solution
  is_removed      BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_thread  ON thread_replies(thread_id, depth, vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_replies_author  ON thread_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent  ON thread_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_accepted ON thread_replies(thread_id, is_accepted) WHERE is_accepted = TRUE;

-- ── Votes ─────────────────────────────────────────────────────────────────────
-- Separate from vibe likes. Used for content ranking.
-- A user can vote on a thread OR a reply, not both at once per row.
CREATE TABLE IF NOT EXISTS forum_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id   UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  reply_id    UUID REFERENCES thread_replies(id) ON DELETE CASCADE,
  value       vote_value NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (thread_id IS NOT NULL AND reply_id IS NULL) OR
    (thread_id IS NULL     AND reply_id IS NOT NULL)
  ),
  UNIQUE (user_id, thread_id),
  UNIQUE (user_id, reply_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_thread ON forum_votes(thread_id);
CREATE INDEX IF NOT EXISTS idx_votes_reply  ON forum_votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_votes_user   ON forum_votes(user_id);

-- ── Community moderators ──────────────────────────────────────────────────────
-- Each category can have up to 5 community moderators.
CREATE TABLE IF NOT EXISTS community_moderators (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        forum_mod_role NOT NULL DEFAULT 'moderator',
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  permissions JSONB NOT NULL DEFAULT '{"pin":false,"lock":true,"remove":true,"warn":true}',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,                            -- null = permanent
  UNIQUE (category_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mod_category ON community_moderators(category_id);
CREATE INDEX IF NOT EXISTS idx_mod_user     ON community_moderators(user_id);

-- ── Forum tags ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  color       TEXT,
  usage_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Thread tags ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_tags (
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_tags_tag ON thread_tags(tag_id);

-- ── Private community memberships ─────────────────────────────────────────────
-- Some forum categories can be private — requires approval to post.
CREATE TABLE IF NOT EXISTS community_memberships (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','banned')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES users(id),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_category ON community_memberships(category_id, status);

-- ── Triggers ──────────────────────────────────────────────────────────────────
-- Update thread reply_count and last_reply_at when a reply is added/removed.
CREATE OR REPLACE FUNCTION fn_update_thread_reply_meta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads SET
      reply_count  = reply_count + 1,
      last_reply_at = NOW()
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_removed THEN
    UPDATE forum_threads SET
      reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_thread_reply_meta ON thread_replies;
CREATE TRIGGER trg_thread_reply_meta
  AFTER INSERT OR DELETE ON thread_replies
  FOR EACH ROW EXECUTE FUNCTION fn_update_thread_reply_meta();

-- Update vote_score on threads and replies when votes change.
CREATE OR REPLACE FUNCTION fn_update_vote_score()
RETURNS TRIGGER AS $$
DECLARE v_delta INT;
BEGIN
  v_delta := CASE WHEN TG_OP = 'DELETE' THEN 0 WHEN NEW.value = 'up' THEN 1 ELSE -1 END;
  IF TG_OP = 'DELETE' THEN
    v_delta := CASE WHEN OLD.value = 'up' THEN -1 ELSE 1 END;
  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := CASE WHEN NEW.value = 'up' THEN 2 ELSE -2 END; -- flipped vote = ±2
  END IF;

  IF COALESCE(NEW.thread_id, OLD.thread_id) IS NOT NULL THEN
    UPDATE forum_threads SET vote_score = vote_score + v_delta WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  END IF;
  IF COALESCE(NEW.reply_id, OLD.reply_id) IS NOT NULL THEN
    UPDATE thread_replies SET vote_score = vote_score + v_delta WHERE id = COALESCE(NEW.reply_id, OLD.reply_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_score ON forum_votes;
CREATE TRIGGER trg_vote_score
  AFTER INSERT OR UPDATE OR DELETE ON forum_votes
  FOR EACH ROW EXECUTE FUNCTION fn_update_vote_score();

-- Update category thread_count.
CREATE OR REPLACE FUNCTION fn_update_category_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE forum_categories SET thread_count = thread_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE forum_categories SET thread_count = thread_count + 1 WHERE id = NEW.category_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE forum_categories SET thread_count = GREATEST(0, thread_count - 1) WHERE id = NEW.category_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE forum_categories SET thread_count = GREATEST(0, thread_count - 1) WHERE id = OLD.category_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_thread_count ON forum_threads;
CREATE TRIGGER trg_category_thread_count
  AFTER INSERT OR UPDATE OR DELETE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION fn_update_category_thread_count();
