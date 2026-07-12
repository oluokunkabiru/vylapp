-- ════════════════════════════════════════════════════════════════════════════
--  VYLAPP COMPLETE DATABASE SCHEMA
--  PostgreSQL 15+  |  Production-ready  |  All platform features
--  Vibe. Learn. Connect.
--
--  SCHEMA GROUPS:
--  01. Extensions & Config
--  02. Enumerations
--  03. Users & Authentication
--  04. Onboarding & Interests
--  05. Connections (Social Graph)
--  06. Vibes (Posts) & Feed
--  07. Spaces (Live Audio/Video)
--  08. Messaging & Conversations
--  09. Notifications & Alerts
--  10. Creator Economy & Monetization
--  11. Subscriptions (Vylapp Pro)
--  12. Trending & Discovery
--  13. Content Moderation
--  14. Autopilot AI Engine
--  15. Analytics & Telemetry
--  16. System & Admin
--  17. Triggers & Functions
--  18. Indexes
--  19. Seed Data
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  01. EXTENSIONS & CONFIGURATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";         -- Search with accents
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Encryption helpers
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance
CREATE EXTENSION IF NOT EXISTS "citext";           -- Case-insensitive text


-- ─────────────────────────────────────────────────────────────────────────────
--  02. ENUMERATIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Feed categories (matches BRAND system in frontend)
CREATE TYPE IF NOT EXISTS feed_category AS ENUM (
  'TECH_VIBES',
  'GLOBAL_CONNECT',
  'CREATIVE_LEARN',
  'HUMAN_POTENTIAL',
  'SPACES_INVITE',
  'GENERAL'
);

-- Auth providers
CREATE TYPE IF NOT EXISTS auth_provider AS ENUM ('local','google','apple','twitter','linkedin');

-- Onboarding progression steps
CREATE TYPE IF NOT EXISTS onboarding_step AS ENUM (
  'welcome','interests','handle','avatar','follow_suggestions','complete'
);

-- Space states
CREATE TYPE IF NOT EXISTS space_status AS ENUM ('scheduled','live','ended','cancelled');

-- Participant roles in Spaces
CREATE TYPE IF NOT EXISTS space_role AS ENUM ('host','co_host','speaker','listener','muted_speaker');

-- Conversation types
CREATE TYPE IF NOT EXISTS conversation_type AS ENUM ('dm','group','space_chat','broadcast');

-- Message content types
CREATE TYPE IF NOT EXISTS message_content_type AS ENUM ('text','image','video','audio','file','vibe_share','space_invite','sticker','reaction_burst');

-- Notification types (matches VYL_ALERTS in frontend)
CREATE TYPE IF NOT EXISTS notification_type AS ENUM (
  'like','repost','reply','mention','follow','connection_request',
  'space_invite','space_live','space_reminder',
  'dm','group_message',
  'creator_tip','creator_sub','creator_milestone',
  'pro_renewal','pro_trial',
  'autopilot_posted','autopilot_cycle_done',
  'content_moderation','badge_earned','system'
);

-- User verification tiers
CREATE TYPE IF NOT EXISTS verification_tier AS ENUM ('none','community','creator','official','partner');

-- Report reasons
CREATE TYPE IF NOT EXISTS report_reason AS ENUM (
  'spam','harassment','misinformation','explicit_content',
  'hate_speech','violence','copyright','impersonation','other'
);

-- Report status
CREATE TYPE IF NOT EXISTS report_status AS ENUM ('pending','under_review','resolved_action','resolved_no_action','dismissed');

-- Subscription plans
CREATE TYPE IF NOT EXISTS subscription_plan AS ENUM ('free','pro_monthly','pro_annual','creator','business');

-- Subscription status
CREATE TYPE IF NOT EXISTS subscription_status AS ENUM ('active','cancelled','expired','trial','paused');

-- Creator payout status
CREATE TYPE IF NOT EXISTS payout_status AS ENUM ('pending','processing','paid','failed','cancelled');

-- Transaction types
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM (
  'super_vibe','creator_subscription','space_ticket',
  'digital_product','paid_dm','tip','pro_subscription','refund'
);

-- Autopilot run status
CREATE TYPE IF NOT EXISTS autopilot_status AS ENUM ('idle','scanning','posting','engaging','replying','complete','stopped','error');

-- Media types
CREATE TYPE IF NOT EXISTS media_type AS ENUM ('image','video','audio','document','gif');

-- Momentum for trending topics
CREATE TYPE IF NOT EXISTS trend_momentum AS ENUM ('emerging','rising','peak','viral','declining');


-- ─────────────────────────────────────────────────────────────────────────────
--  03. USERS & AUTHENTICATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  -- Identity
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               CITEXT UNIQUE NOT NULL,
  handle              CITEXT UNIQUE NOT NULL,          -- without @
  display_name        TEXT NOT NULL,
  bio                 TEXT,
  location            TEXT,
  website             TEXT,
  birthday            DATE,
  language            TEXT DEFAULT 'en',               -- UI language
  timezone            TEXT DEFAULT 'UTC',

  -- Avatar
  avatar_color        TEXT NOT NULL DEFAULT '#7C3AED', -- brand hex
  avatar_initials     TEXT NOT NULL DEFAULT 'VY',
  avatar_url          TEXT,                            -- CDN URL
  banner_url          TEXT,                            -- Profile banner CDN URL

  -- Role & tags
  role_tag            TEXT,                            -- "Tech Viber", "DAO Learner"
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  verification_tier   verification_tier NOT NULL DEFAULT 'none',
  is_admin            BOOLEAN NOT NULL DEFAULT FALSE,
  is_creator          BOOLEAN NOT NULL DEFAULT FALSE,
  is_bot              BOOLEAN NOT NULL DEFAULT FALSE,

  -- Auth
  password_hash       TEXT,                            -- bcrypt, null for social
  provider            auth_provider NOT NULL DEFAULT 'local',
  provider_id         TEXT,
  provider_token      TEXT,                            -- encrypted OAuth token
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret   TEXT,                            -- TOTP secret (encrypted)
  recovery_codes      TEXT[],                          -- encrypted 2FA backup codes

  -- Session & presence
  online              BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen           TIMESTAMPTZ,
  last_ip             INET,

  -- Onboarding
  onboarding_step     onboarding_step NOT NULL DEFAULT 'welcome',
  onboarding_done     BOOLEAN NOT NULL DEFAULT FALSE,
  interests           TEXT[] DEFAULT '{}',             -- ['tech','global','creative',...]

  -- Content settings
  allow_dms           BOOLEAN NOT NULL DEFAULT TRUE,
  allow_paid_dms      BOOLEAN NOT NULL DEFAULT FALSE,
  paid_dm_price_usd   NUMERIC(8,2) DEFAULT 0,
  content_language    TEXT[] DEFAULT '{"en"}',

  -- Translation (Vylapp Pro feature)
  translation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  translation_languages TEXT[] DEFAULT '{}',

  -- Privacy
  private_account     BOOLEAN NOT NULL DEFAULT FALSE,
  hide_from_search    BOOLEAN NOT NULL DEFAULT FALSE,
  hide_connection_count BOOLEAN NOT NULL DEFAULT FALSE,

  -- Subscription
  subscription_plan   subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status,
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id  TEXT UNIQUE,

  -- Denormalized counters (updated via trigger)
  vibes_count         INT NOT NULL DEFAULT 0,
  connections_count   INT NOT NULL DEFAULT 0,    -- followers
  following_count     INT NOT NULL DEFAULT 0,
  spaces_hosted       INT NOT NULL DEFAULT 0,
  creator_earnings_usd NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Account status
  is_suspended        BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_at        TIMESTAMPTZ,
  suspended_reason    TEXT,
  is_deactivated      BOOLEAN NOT NULL DEFAULT FALSE,
  deactivated_at      TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,                     -- soft delete

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth sessions & refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  device_info JSONB,                                   -- browser, OS, IP
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email verification
CREATE TABLE email_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  new_email   CITEXT,                                  -- if changing email
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_resets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Two-factor authentication challenges
CREATE TABLE two_factor_challenges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth state tokens (CSRF protection)
CREATE TABLE oauth_states (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state       TEXT UNIQUE NOT NULL,
  provider    auth_provider NOT NULL,
  redirect_to TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  04. ONBOARDING & INTERESTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Tracks detailed onboarding event history
CREATE TABLE onboarding_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step        onboarding_step NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB,                                   -- step-specific payload
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interest categories (canonical list)
CREATE TABLE interest_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,                    -- 'tech', 'global', etc.
  label       TEXT NOT NULL,                           -- 'TECH VIBES'
  emoji       TEXT NOT NULL,
  color       TEXT NOT NULL,                           -- hex
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User badge system (earned through actions)
CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  criteria    JSONB NOT NULL DEFAULT '{}',             -- JSON rules for awarding
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
--  05. CONNECTIONS (SOCIAL GRAPH)
-- ─────────────────────────────────────────────────────────────────────────────

-- Core follow relationships
CREATE TABLE connections (
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notify_posts  BOOLEAN NOT NULL DEFAULT TRUE,         -- notify on new vibes
  notify_spaces BOOLEAN NOT NULL DEFAULT TRUE,         -- notify on spaces
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Connection requests (for private accounts)
CREATE TABLE connection_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',       -- pending|approved|declined
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  UNIQUE (requester_id, target_id)
);

-- User blocks
CREATE TABLE user_blocks (
  blocker_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- User mutes (content still exists, not shown to muter)
CREATE TABLE user_mutes (
  muter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id)
);

-- Close friends list (for restricted content)
CREATE TABLE close_connections (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
--  06. VIBES (POSTS) & FEED
-- ─────────────────────────────────────────────────────────────────────────────

-- Core posts table
CREATE TABLE vibes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  content_html    TEXT,                                -- sanitized HTML for rich display
  category        feed_category NOT NULL DEFAULT 'GENERAL',
  tags            TEXT[] DEFAULT '{}',                 -- hashtags, stored lowercase
  language        TEXT DEFAULT 'en',                   -- detected content language

  -- Threading
  reply_to        UUID REFERENCES vibes(id) ON DELETE SET NULL,
  repost_of       UUID REFERENCES vibes(id) ON DELETE SET NULL,
  quote_of        UUID REFERENCES vibes(id) ON DELETE SET NULL,
  thread_root_id  UUID REFERENCES vibes(id) ON DELETE SET NULL,
  thread_depth    INT NOT NULL DEFAULT 0,

  -- Visibility
  is_close_friends BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid_content BOOLEAN NOT NULL DEFAULT FALSE,
  paid_content_price_usd NUMERIC(8,2),

  -- Event card (from frontend VIBES data)
  event_title     TEXT,
  event_time      TEXT,
  event_space_id  UUID,                                -- FK added later after spaces table
  event_reminded_count INT NOT NULL DEFAULT 0,
  event_interested_count INT NOT NULL DEFAULT 0,

  -- Engagement counters (denormalized for read performance)
  likes_count     INT NOT NULL DEFAULT 0,
  reposts_count   INT NOT NULL DEFAULT 0,
  replies_count   INT NOT NULL DEFAULT 0,
  quotes_count    INT NOT NULL DEFAULT 0,
  views_count     INT NOT NULL DEFAULT 0,
  shares_count    INT NOT NULL DEFAULT 0,
  bookmarks_count INT NOT NULL DEFAULT 0,

  -- AI / Autopilot metadata
  is_autopilot    BOOLEAN NOT NULL DEFAULT FALSE,
  autopilot_run_id UUID,                               -- FK added later
  autopilot_topic TEXT,
  autopilot_trend_heat INT,
  autopilot_momentum trend_momentum,

  -- Badge / label
  impact_badge    TEXT,                                -- "GLOBAL IMPACT" etc.

  -- Moderation
  is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  moderation_note TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at    TIMESTAMPTZ                          -- future post scheduling
);

-- Add FK back-reference to event space
ALTER TABLE vibes ADD CONSTRAINT fk_vibes_event_space
  FOREIGN KEY (event_space_id) REFERENCES vibes(id) DEFERRABLE INITIALLY DEFERRED;

-- Media attachments for vibes
CREATE TABLE vibe_media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibe_id     UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  media_type  media_type NOT NULL,
  url         TEXT NOT NULL,                           -- CDN URL
  thumbnail_url TEXT,
  width       INT,
  height      INT,
  duration_ms INT,                                     -- for audio/video
  size_bytes  BIGINT,
  alt_text    TEXT,                                    -- accessibility
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes on vibes
CREATE TABLE vibe_likes (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id    UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vibe_id)
);

-- Reposts
CREATE TABLE vibe_reposts (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id    UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vibe_id)
);

-- Bookmarks (saves)
CREATE TABLE vibe_bookmarks (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id    UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vibe_id)
);

-- Space event reminders
CREATE TABLE vibe_event_reminders (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id    UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  reminded   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vibe_id)
);

-- Polls embedded in vibes
CREATE TABLE vibe_polls (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibe_id      UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE UNIQUE,
  question     TEXT NOT NULL,
  closes_at    TIMESTAMPTZ NOT NULL,
  total_votes  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vibe_poll_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES vibe_polls(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  votes_count INT NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE vibe_poll_votes (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poll_id   UUID NOT NULL REFERENCES vibe_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES vibe_poll_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, poll_id)
);

-- Feed algorithm: pre-computed feed slots (materialized/queue-based)
CREATE TABLE feed_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id     UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  score       NUMERIC(10,4) NOT NULL DEFAULT 0,        -- ranking score
  source      TEXT NOT NULL DEFAULT 'following',       -- following|explore|trending|recommended
  seen        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vibe_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
--  07. SPACES (LIVE AUDIO / VIDEO ROOMS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE spaces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  title           TEXT NOT NULL,
  description     TEXT,
  category        feed_category NOT NULL DEFAULT 'GENERAL',
  tags            TEXT[] DEFAULT '{}',
  color           TEXT DEFAULT '#7C3AED',              -- accent color for UI

  -- Type
  is_video        BOOLEAN NOT NULL DEFAULT FALSE,      -- audio-only vs video
  is_recorded     BOOLEAN NOT NULL DEFAULT FALSE,
  is_ticketed     BOOLEAN NOT NULL DEFAULT FALSE,
  ticket_price_usd NUMERIC(8,2),
  is_subscription_only BOOLEAN NOT NULL DEFAULT FALSE, -- paid subs only
  is_close_friends BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status / timing
  status          space_status NOT NULL DEFAULT 'scheduled',
  scheduled_for   TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INT,

  -- Real-time stats (live counters)
  listeners_count INT NOT NULL DEFAULT 0,
  peak_listeners  INT NOT NULL DEFAULT 0,
  speakers_count  INT NOT NULL DEFAULT 0,
  total_tips_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Recording
  recording_url   TEXT,                                -- CDN URL of recording
  recording_size_bytes BIGINT,
  transcript_url  TEXT,                                -- auto-generated transcript

  -- Translation support
  translation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  languages       TEXT[] DEFAULT '{}',

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Space participants (real-time presence)
CREATE TABLE space_participants (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        space_role NOT NULL DEFAULT 'listener',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  was_speaker BOOLEAN NOT NULL DEFAULT FALSE,
  tip_total_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (space_id, user_id)
);

-- Space participant history (for ended spaces)
CREATE TABLE space_participant_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        space_role NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL,
  left_at     TIMESTAMPTZ,
  duration_seconds INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Space reminders
CREATE TABLE space_reminders (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (space_id, user_id)
);

-- Space co-host invitations
CREATE TABLE space_cohosts (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'invited',         -- invited|accepted|declined
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (space_id, user_id)
);

-- Space speaker requests (listeners raising hand)
CREATE TABLE space_speaker_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',         -- pending|approved|declined
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Space tickets (monetized spaces)
CREATE TABLE space_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_usd   NUMERIC(8,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

-- Space tips (Super Vibes during spaces)
CREATE TABLE space_tips (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  tipper_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_usd  NUMERIC(8,2) NOT NULL,
  message     TEXT,
  stripe_payment_intent_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  08. MESSAGING & CONVERSATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         conversation_type NOT NULL DEFAULT 'dm',
  name         TEXT,                                   -- group name
  description  TEXT,
  color        TEXT,                                   -- group accent color
  avatar_url   TEXT,                                   -- group avatar CDN URL
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Space chat link
  space_id     UUID REFERENCES spaces(id) ON DELETE CASCADE,

  -- Latest message (denormalized for list view)
  last_message_id   UUID,
  last_message_at   TIMESTAMPTZ,
  last_message_preview TEXT,

  -- Settings
  is_announcement  BOOLEAN NOT NULL DEFAULT FALSE,     -- broadcast channel

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',      -- admin|member
  nickname        TEXT,                                -- nickname in this conversation
  unread_count    INT NOT NULL DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  muted_until     TIMESTAMPTZ,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  content           TEXT CHECK (char_length(content) <= 2000),
  content_type      message_content_type NOT NULL DEFAULT 'text',
  content_html      TEXT,

  -- Threading
  reply_to_id       UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Shared content
  shared_vibe_id    UUID REFERENCES vibes(id) ON DELETE SET NULL,
  shared_space_id   UUID REFERENCES spaces(id) ON DELETE SET NULL,

  -- Status
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  edited_at         TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE message_reads (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Message reactions (emoji reactions to DMs)
CREATE TABLE message_reactions (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Message media attachments
CREATE TABLE message_media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_type  media_type NOT NULL,
  url         TEXT NOT NULL,
  thumbnail_url TEXT,
  width       INT,
  height      INT,
  duration_ms INT,
  size_bytes  BIGINT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sticker packs
CREATE TABLE sticker_packs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  preview_url TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stickers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id     UUID NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  url         TEXT NOT NULL,
  tags        TEXT[] DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paid DM access records
CREATE TABLE paid_dm_access (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_usd      NUMERIC(8,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  09. NOTIFICATIONS & ALERTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,

  -- Polymorphic references
  vibe_id     UUID REFERENCES vibes(id) ON DELETE CASCADE,
  space_id    UUID REFERENCES spaces(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Display
  title       TEXT,
  body        TEXT NOT NULL,
  icon        TEXT,                                    -- emoji or URL

  -- State
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  is_pushed   BOOLEAN NOT NULL DEFAULT FALSE,          -- push notification sent
  read_at     TIMESTAMPTZ,

  -- Grouping (collapse similar notifications)
  group_key   TEXT,
  group_count INT NOT NULL DEFAULT 1,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push notification device tokens
CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL,                           -- ios|android|web
  device_name TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token)
);

-- Notification preferences per user
CREATE TABLE notification_preferences (
  user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_likes              BOOLEAN NOT NULL DEFAULT TRUE,
  email_reposts            BOOLEAN NOT NULL DEFAULT TRUE,
  email_follows            BOOLEAN NOT NULL DEFAULT TRUE,
  email_mentions           BOOLEAN NOT NULL DEFAULT TRUE,
  email_dms                BOOLEAN NOT NULL DEFAULT TRUE,
  email_spaces             BOOLEAN NOT NULL DEFAULT TRUE,
  email_marketing          BOOLEAN NOT NULL DEFAULT FALSE,
  push_likes               BOOLEAN NOT NULL DEFAULT TRUE,
  push_reposts             BOOLEAN NOT NULL DEFAULT TRUE,
  push_follows             BOOLEAN NOT NULL DEFAULT TRUE,
  push_mentions            BOOLEAN NOT NULL DEFAULT TRUE,
  push_dms                 BOOLEAN NOT NULL DEFAULT TRUE,
  push_spaces              BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_all               BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start        TIME,
  quiet_hours_end          TIME,
  quiet_hours_timezone     TEXT DEFAULT 'UTC',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  10. CREATOR ECONOMY & MONETIZATION
-- ─────────────────────────────────────────────────────────────────────────────

-- Creator profiles (extended info for creators)
CREATE TABLE creator_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio_extended      TEXT,
  categories        TEXT[] DEFAULT '{}',
  social_links      JSONB DEFAULT '{}',
  stripe_account_id TEXT UNIQUE,                       -- Stripe Connect
  stripe_onboarded  BOOLEAN NOT NULL DEFAULT FALSE,
  payout_schedule   TEXT DEFAULT 'weekly',             -- daily|weekly|monthly
  minimum_payout_usd NUMERIC(8,2) DEFAULT 50,
  total_earned_usd  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_balance_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  subscriber_count  INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator subscription tiers
CREATE TABLE creator_subscription_tiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price_usd       NUMERIC(8,2) NOT NULL,
  billing_period  TEXT NOT NULL DEFAULT 'monthly',     -- monthly|annual
  perks           TEXT[] DEFAULT '{}',
  max_subscribers INT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active creator subscriptions
CREATE TABLE creator_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id         UUID NOT NULL REFERENCES creator_subscription_tiers(id),
  status          subscription_status NOT NULL DEFAULT 'active',
  price_usd       NUMERIC(8,2) NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscriber_id, creator_id)
);

-- Super Vibes (tipped reactions on feed posts)
CREATE TABLE super_vibes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id         UUID REFERENCES vibes(id) ON DELETE SET NULL,
  space_id        UUID REFERENCES spaces(id) ON DELETE SET NULL,
  amount_usd      NUMERIC(8,2) NOT NULL,
  emoji           TEXT DEFAULT '⚡',
  message         TEXT,
  stripe_payment_intent_id TEXT,
  platform_fee_usd NUMERIC(8,2) NOT NULL,              -- 20% Vylapp cut
  creator_net_usd NUMERIC(8,2) NOT NULL,               -- 80% to creator
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Digital products (downloadable content sold through Vylapp)
CREATE TABLE digital_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  preview_url     TEXT,
  file_url        TEXT,                                -- encrypted CDN URL
  file_type       TEXT,
  file_size_bytes BIGINT,
  price_usd       NUMERIC(8,2) NOT NULL,
  purchases_count INT NOT NULL DEFAULT 0,
  revenue_total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE digital_product_purchases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_usd       NUMERIC(8,2) NOT NULL,
  platform_fee_usd NUMERIC(8,2) NOT NULL,
  creator_net_usd NUMERIC(8,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  download_count  INT NOT NULL DEFAULT 0,
  max_downloads   INT NOT NULL DEFAULT 5,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, buyer_id)
);

-- All financial transactions (unified ledger)
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type            transaction_type NOT NULL,
  direction       TEXT NOT NULL,                       -- 'debit' | 'credit'
  amount_usd      NUMERIC(10,2) NOT NULL,
  platform_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_usd         NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'completed',   -- pending|completed|failed|refunded
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator payouts
CREATE TABLE creator_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_usd      NUMERIC(10,2) NOT NULL,
  stripe_payout_id TEXT,
  stripe_account_id TEXT,
  status          payout_status NOT NULL DEFAULT 'pending',
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  11. SUBSCRIPTIONS (VYLAPP PRO)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE platform_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            subscription_plan NOT NULL,
  status          subscription_status NOT NULL DEFAULT 'active',
  price_usd       NUMERIC(8,2) NOT NULL,
  billing_period  TEXT NOT NULL DEFAULT 'monthly',     -- monthly|annual
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pro feature flag overrides (for manual grants, referrals, etc.)
CREATE TABLE feature_grants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,                           -- 'pro_translation', 'extended_streams'
  granted_by  UUID REFERENCES users(id),
  reason      TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  12. TRENDING & DISCOVERY
-- ─────────────────────────────────────────────────────────────────────────────

-- Hashtag registry
CREATE TABLE hashtags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag         CITEXT UNIQUE NOT NULL,                  -- normalized, lowercase
  vibes_count INT NOT NULL DEFAULT 0,
  week_vibes_count INT NOT NULL DEFAULT 0,             -- rolling 7-day window
  day_vibes_count  INT NOT NULL DEFAULT 0,             -- rolling 24-hour window
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trending tags snapshots (hourly materialized)
CREATE TABLE trending_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag         TEXT NOT NULL,
  category    feed_category,
  region      TEXT,                                    -- 'Global','Africa','Asia', etc.
  score       NUMERIC(10,4) NOT NULL DEFAULT 0,
  vibe_count  INT NOT NULL DEFAULT 0,
  velocity    NUMERIC(8,4) NOT NULL DEFAULT 0,         -- rate of growth
  momentum    trend_momentum NOT NULL DEFAULT 'rising',
  heat        INT NOT NULL DEFAULT 50,                 -- 0-100
  headline    TEXT,                                    -- why trending
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved/bookmarked searches
CREATE TABLE saved_searches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search history (for personalization)
CREATE TABLE search_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  result_type TEXT,                                    -- user|vibe|hashtag|space
  clicked_id  UUID,                                    -- entity user clicked
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Explore feed topics (editorially curated)
CREATE TABLE explore_topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label       TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  category    feed_category NOT NULL,
  color       TEXT NOT NULL,
  member_count INT NOT NULL DEFAULT 0,
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User topic memberships (from Explore)
CREATE TABLE user_topic_memberships (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    UUID NOT NULL REFERENCES explore_topics(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, topic_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
--  13. CONTENT MODERATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reported entity (polymorphic)
  reported_vibe_id    UUID REFERENCES vibes(id) ON DELETE SET NULL,
  reported_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_space_id   UUID REFERENCES spaces(id) ON DELETE SET NULL,
  reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  reason          report_reason NOT NULL,
  detail          TEXT,
  status          report_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  action_taken    TEXT,                                -- 'removed'|'warned'|'suspended'|'none'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Moderation audit log
CREATE TABLE moderation_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_vibe_id UUID REFERENCES vibes(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                           -- 'suspend'|'remove_vibe'|'warn'
  reason      TEXT,
  duration_hours INT,
  report_id   UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filtered keywords / blocked phrases
CREATE TABLE content_filters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phrase      TEXT NOT NULL,
  action      TEXT NOT NULL DEFAULT 'flag',            -- 'block'|'flag'|'warn'
  category    TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spam/bot detection signals
CREATE TABLE trust_signals (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trust_score     NUMERIC(5,2) NOT NULL DEFAULT 50,    -- 0-100
  spam_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  bot_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  report_count    INT NOT NULL DEFAULT 0,
  warning_count   INT NOT NULL DEFAULT 0,
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  14. AUTOPILOT AI ENGINE
-- ─────────────────────────────────────────────────────────────────────────────

-- Autopilot configuration per user
CREATE TABLE autopilot_configs (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  auto_post       BOOLEAN NOT NULL DEFAULT TRUE,
  auto_engage     BOOLEAN NOT NULL DEFAULT TRUE,
  auto_reply      BOOLEAN NOT NULL DEFAULT TRUE,
  post_interval_secs INT NOT NULL DEFAULT 6,
  reply_delay_secs   INT NOT NULL DEFAULT 3,
  max_posts_per_run  INT NOT NULL DEFAULT 8,
  active_categories TEXT[] DEFAULT '{"tech","global","creative","human","spaces"}',
  persona_viber_id TEXT,                               -- preferred persona viber ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Autopilot run history
CREATE TABLE autopilot_runs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            autopilot_status NOT NULL DEFAULT 'idle',
  posts_generated   INT NOT NULL DEFAULT 0,
  replies_generated INT NOT NULL DEFAULT 0,
  topics_scanned    INT NOT NULL DEFAULT 0,
  total_likes_est   INT NOT NULL DEFAULT 0,
  total_reposts_est INT NOT NULL DEFAULT 0,
  error_message     TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- Trending topics discovered by autopilot AI
CREATE TABLE autopilot_topics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id        UUID NOT NULL REFERENCES autopilot_runs(id) ON DELETE CASCADE,
  category      feed_category NOT NULL,
  topic         TEXT NOT NULL,
  headline      TEXT NOT NULL,
  heat          INT NOT NULL DEFAULT 50,
  region        TEXT NOT NULL DEFAULT 'Global',
  momentum      trend_momentum NOT NULL DEFAULT 'rising',
  hashtags      TEXT[] DEFAULT '{}',
  posted        BOOLEAN NOT NULL DEFAULT FALSE,
  vibe_id       UUID REFERENCES vibes(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Autopilot generated comments (engagement simulation log)
CREATE TABLE autopilot_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id        UUID NOT NULL REFERENCES autopilot_runs(id) ON DELETE CASCADE,
  vibe_id       UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  commenter_viber_id TEXT NOT NULL,
  commenter_name TEXT NOT NULL,
  content       TEXT NOT NULL,
  sentiment     TEXT NOT NULL DEFAULT 'positive',      -- positive|question|story|agree|pushback|excited
  simulated_likes INT NOT NULL DEFAULT 0,
  auto_replied  BOOLEAN NOT NULL DEFAULT FALSE,
  reply_content TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Autopilot schedule (cron-style scheduling for future automation)
CREATE TABLE autopilot_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,                       -- '0 9,12,18 * * *'
  preset_name     TEXT NOT NULL DEFAULT 'peak',        -- peak|morning|evening|custom
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  15. ANALYTICS & TELEMETRY
-- ─────────────────────────────────────────────────────────────────────────────

-- Vibe view/impression tracking
CREATE TABLE vibe_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibe_id     UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES users(id) ON DELETE SET NULL,  -- null = anonymous
  session_id  TEXT,
  source      TEXT,                                    -- feed|explore|profile|search|direct
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User activity log (general telemetry)
CREATE TABLE user_activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,                           -- 'vibe_like','space_join' etc.
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator analytics snapshots (daily rollup)
CREATE TABLE creator_analytics_daily (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  new_followers   INT NOT NULL DEFAULT 0,
  lost_followers  INT NOT NULL DEFAULT 0,
  profile_views   INT NOT NULL DEFAULT 0,
  vibe_impressions INT NOT NULL DEFAULT 0,
  vibe_likes      INT NOT NULL DEFAULT 0,
  vibe_reposts    INT NOT NULL DEFAULT 0,
  space_listeners INT NOT NULL DEFAULT 0,
  space_minutes   INT NOT NULL DEFAULT 0,
  earnings_usd    NUMERIC(10,2) NOT NULL DEFAULT 0,
  new_subscribers INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id, date)
);

-- Platform-wide metrics snapshots (hourly)
CREATE TABLE platform_metrics_hourly (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_users    INT NOT NULL DEFAULT 0,
  new_users       INT NOT NULL DEFAULT 0,
  vibes_posted    INT NOT NULL DEFAULT 0,
  spaces_live     INT NOT NULL DEFAULT 0,
  space_listeners INT NOT NULL DEFAULT 0,
  messages_sent   INT NOT NULL DEFAULT 0,
  revenue_usd     NUMERIC(12,2) NOT NULL DEFAULT 0
);


-- ─────────────────────────────────────────────────────────────────────────────
--  16. SYSTEM & ADMIN
-- ─────────────────────────────────────────────────────────────────────────────

-- Feature flags (platform-wide)
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_pct INT NOT NULL DEFAULT 0,                  -- 0-100 % of users
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User feature flag overrides
CREATE TABLE user_feature_flags (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_id     UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, flag_id)
);

-- App configurations (key-value config store)
CREATE TABLE app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin audit log (all admin actions)
CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  before_data JSONB,
  after_data  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Background job queue
CREATE TABLE job_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue       TEXT NOT NULL DEFAULT 'default',
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending',         -- pending|running|done|failed
  attempts    INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  priority    INT NOT NULL DEFAULT 0,
  error       TEXT,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CDN media asset registry
CREATE TABLE media_assets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  cdn_key     TEXT UNIQUE NOT NULL,
  media_type  media_type NOT NULL,
  width       INT,
  height      INT,
  duration_ms INT,
  size_bytes  BIGINT NOT NULL,
  mime_type   TEXT NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook subscriptions (for developer API)
CREATE TABLE webhooks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',
  secret      TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired  TIMESTAMPTZ,
  fail_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
--  17. TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_vibes_updated       BEFORE UPDATE ON vibes              FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_spaces_updated      BEFORE UPDATE ON spaces             FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_creator_profiles_updated BEFORE UPDATE ON creator_profiles FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_creator_sub_tiers_updated BEFORE UPDATE ON creator_subscription_tiers FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_platform_subs_updated BEFORE UPDATE ON platform_subscriptions FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_autopilot_cfg_updated BEFORE UPDATE ON autopilot_configs FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_autopilot_sched_updated BEFORE UPDATE ON autopilot_schedules FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_push_tokens_updated BEFORE UPDATE ON push_tokens        FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_notif_prefs_updated BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_feature_flags_updated BEFORE UPDATE ON feature_flags    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_trust_signals_updated BEFORE UPDATE ON trust_signals    FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_digital_products_updated BEFORE UPDATE ON digital_products FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- Increment/decrement vibe likes count
CREATE OR REPLACE FUNCTION fn_vibe_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vibes SET likes_count = likes_count + 1 WHERE id = NEW.vibe_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vibes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.vibe_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_vibe_likes AFTER INSERT OR DELETE ON vibe_likes FOR EACH ROW EXECUTE FUNCTION fn_vibe_likes_count();

-- Increment/decrement vibe reposts count
CREATE OR REPLACE FUNCTION fn_vibe_reposts_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vibes SET reposts_count = reposts_count + 1 WHERE id = NEW.vibe_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vibes SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.vibe_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_vibe_reposts AFTER INSERT OR DELETE ON vibe_reposts FOR EACH ROW EXECUTE FUNCTION fn_vibe_reposts_count();

-- Increment reply count on parent vibe
CREATE OR REPLACE FUNCTION fn_vibe_replies_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to IS NOT NULL THEN
    UPDATE vibes SET replies_count = replies_count + 1 WHERE id = NEW.reply_to;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE AND OLD.reply_to IS NOT NULL THEN
    UPDATE vibes SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.reply_to;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_vibe_reply_count AFTER INSERT OR UPDATE ON vibes FOR EACH ROW EXECUTE FUNCTION fn_vibe_replies_count();

-- Increment/decrement user vibes count
CREATE OR REPLACE FUNCTION fn_user_vibes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET vibes_count = vibes_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    UPDATE users SET vibes_count = GREATEST(0, vibes_count - 1) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_user_vibes_count AFTER INSERT OR UPDATE ON vibes FOR EACH ROW EXECUTE FUNCTION fn_user_vibes_count();

-- Update follower/following counts on connections
CREATE OR REPLACE FUNCTION fn_connection_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET connections_count = connections_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count   = following_count + 1   WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET connections_count = GREATEST(0, connections_count - 1) WHERE id = OLD.following_id;
    UPDATE users SET following_count   = GREATEST(0, following_count - 1)   WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_connection_counts AFTER INSERT OR DELETE ON connections FOR EACH ROW EXECUTE FUNCTION fn_connection_counts();

-- Update hashtag counts when vibes are created/deleted
CREATE OR REPLACE FUNCTION fn_hashtag_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_tag TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOREACH v_tag IN ARRAY COALESCE(NEW.tags, '{}') LOOP
      INSERT INTO hashtags (tag, vibes_count) VALUES (lower(v_tag), 1)
        ON CONFLICT (tag) DO UPDATE SET vibes_count = hashtags.vibes_count + 1, last_seen = NOW();
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    FOREACH v_tag IN ARRAY COALESCE(OLD.tags, '{}') LOOP
      UPDATE hashtags SET vibes_count = GREATEST(0, vibes_count - 1) WHERE tag = lower(v_tag);
    END LOOP;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_hashtag_counts AFTER INSERT OR UPDATE ON vibes FOR EACH ROW EXECUTE FUNCTION fn_hashtag_counts();

-- Update unread count when new message arrives
CREATE OR REPLACE FUNCTION fn_message_unread()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversation_members
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id AND left_at IS NULL;

  UPDATE conversations
  SET last_message_id = NEW.id, last_message_at = NEW.created_at,
      last_message_preview = left(NEW.content, 100), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_message_unread AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION fn_message_unread();

-- Update space listeners count
CREATE OR REPLACE FUNCTION fn_space_listener_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE spaces SET
      listeners_count = listeners_count + 1,
      peak_listeners  = GREATEST(peak_listeners, listeners_count + 1)
    WHERE id = NEW.space_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    UPDATE spaces SET listeners_count = GREATEST(0, listeners_count - 1) WHERE id = NEW.space_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_space_listeners AFTER INSERT OR UPDATE ON space_participants FOR EACH ROW EXECUTE FUNCTION fn_space_listener_count();

-- Update creator subscriber count
CREATE OR REPLACE FUNCTION fn_creator_subscriber_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    UPDATE creator_profiles SET subscriber_count = subscriber_count + 1 WHERE user_id = NEW.creator_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active' THEN
    UPDATE creator_profiles SET subscriber_count = GREATEST(0, subscriber_count - 1) WHERE user_id = NEW.creator_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_creator_sub_count AFTER INSERT OR UPDATE ON creator_subscriptions FOR EACH ROW EXECUTE FUNCTION fn_creator_subscriber_count();

-- Create default autopilot config for new users
CREATE OR REPLACE FUNCTION fn_default_autopilot_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO autopilot_configs (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_new_user_defaults AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION fn_default_autopilot_config();


-- ─────────────────────────────────────────────────────────────────────────────
--  18. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users
CREATE INDEX idx_users_handle              ON users(handle);
CREATE INDEX idx_users_email               ON users(email);
CREATE INDEX idx_users_provider            ON users(provider, provider_id);
CREATE INDEX idx_users_online              ON users(online) WHERE online = TRUE;
CREATE INDEX idx_users_subscription        ON users(subscription_plan, subscription_status);
CREATE INDEX idx_users_created             ON users(created_at DESC);
CREATE INDEX idx_users_search_handle       ON users USING gin(handle gin_trgm_ops);
CREATE INDEX idx_users_search_name         ON users USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_users_not_deleted         ON users(id) WHERE deleted_at IS NULL;

-- Refresh tokens
CREATE INDEX idx_refresh_tokens_user       ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token      ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expiry     ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Connections
CREATE INDEX idx_connections_follower      ON connections(follower_id);
CREATE INDEX idx_connections_following     ON connections(following_id);
CREATE INDEX idx_user_blocks_blocker       ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked       ON user_blocks(blocked_id);
CREATE INDEX idx_user_mutes_muter          ON user_mutes(muter_id);

-- Vibes
CREATE INDEX idx_vibes_user                ON vibes(user_id, created_at DESC);
CREATE INDEX idx_vibes_category            ON vibes(category, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_vibes_created             ON vibes(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_vibes_reply_to            ON vibes(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX idx_vibes_thread_root         ON vibes(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX idx_vibes_tags                ON vibes USING gin(tags);
CREATE INDEX idx_vibes_trending            ON vibes(likes_count DESC, reposts_count DESC, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_vibes_scheduled           ON vibes(scheduled_at) WHERE scheduled_at IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX idx_vibes_autopilot           ON vibes(is_autopilot, created_at DESC) WHERE is_autopilot = TRUE;
CREATE INDEX idx_vibes_feed_cat            ON vibes(category, created_at DESC, likes_count DESC) WHERE is_deleted = FALSE;

-- Vibe engagement
CREATE INDEX idx_vibe_likes_vibe           ON vibe_likes(vibe_id);
CREATE INDEX idx_vibe_likes_user           ON vibe_likes(user_id);
CREATE INDEX idx_vibe_reposts_vibe         ON vibe_reposts(vibe_id);
CREATE INDEX idx_vibe_bookmarks_user       ON vibe_bookmarks(user_id);
CREATE INDEX idx_vibe_views_vibe           ON vibe_views(vibe_id, viewed_at DESC);
CREATE INDEX idx_vibe_views_viewer         ON vibe_views(viewer_id) WHERE viewer_id IS NOT NULL;

-- Spaces
CREATE INDEX idx_spaces_status             ON spaces(status, created_at DESC);
CREATE INDEX idx_spaces_host               ON spaces(host_id);
CREATE INDEX idx_spaces_scheduled         ON spaces(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_spaces_live               ON spaces(listeners_count DESC) WHERE status = 'live';
CREATE INDEX idx_space_participants_space  ON space_participants(space_id);
CREATE INDEX idx_space_participants_user   ON space_participants(user_id);
CREATE INDEX idx_space_reminders_space     ON space_reminders(space_id);
CREATE INDEX idx_space_reminders_user      ON space_reminders(user_id);
CREATE INDEX idx_space_tips_space          ON space_tips(space_id, created_at DESC);
CREATE INDEX idx_space_tips_recipient      ON space_tips(recipient_id, created_at DESC);

-- Conversations & Messages
CREATE INDEX idx_conv_members_user         ON conversation_members(user_id, last_read_at DESC);
CREATE INDEX idx_conv_members_conv         ON conversation_members(conversation_id);
CREATE INDEX idx_conv_updated              ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conv             ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender           ON messages(sender_id);
CREATE INDEX idx_message_reads_msg         ON message_reads(message_id);
CREATE INDEX idx_message_reads_user        ON message_reads(user_id);
CREATE INDEX idx_message_reactions_msg     ON message_reactions(message_id);

-- Notifications
CREATE INDEX idx_notifications_user        ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread      ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_group       ON notifications(user_id, group_key, created_at DESC);
CREATE INDEX idx_push_tokens_user          ON push_tokens(user_id) WHERE active = TRUE;

-- Creator economy
CREATE INDEX idx_creator_subs_creator      ON creator_subscriptions(creator_id, status);
CREATE INDEX idx_creator_subs_subscriber   ON creator_subscriptions(subscriber_id);
CREATE INDEX idx_super_vibes_recipient     ON super_vibes(recipient_id, created_at DESC);
CREATE INDEX idx_super_vibes_vibe          ON super_vibes(vibe_id) WHERE vibe_id IS NOT NULL;
CREATE INDEX idx_transactions_user         ON transactions(user_id, created_at DESC);
CREATE INDEX idx_creator_payouts_creator   ON creator_payouts(creator_id, status);
CREATE INDEX idx_digital_products_creator  ON digital_products(creator_id) WHERE active = TRUE;

-- Trending & discovery
CREATE INDEX idx_hashtags_count            ON hashtags(vibes_count DESC);
CREATE INDEX idx_hashtags_tag              ON hashtags(tag);
CREATE INDEX idx_hashtags_day              ON hashtags(day_vibes_count DESC);
CREATE INDEX idx_hashtags_week             ON hashtags(week_vibes_count DESC);
CREATE INDEX idx_trending_tags_score       ON trending_tags(score DESC, snapshot_at DESC);
CREATE INDEX idx_trending_tags_category    ON trending_tags(category, heat DESC);
CREATE INDEX idx_feed_items_user           ON feed_items(user_id, score DESC, seen);

-- Autopilot
CREATE INDEX idx_autopilot_runs_user       ON autopilot_runs(user_id, started_at DESC);
CREATE INDEX idx_autopilot_topics_run      ON autopilot_topics(run_id);
CREATE INDEX idx_autopilot_comments_vibe   ON autopilot_comments(vibe_id);
CREATE INDEX idx_autopilot_schedules_user  ON autopilot_schedules(user_id) WHERE enabled = TRUE;
CREATE INDEX idx_autopilot_schedules_next  ON autopilot_schedules(next_run_at) WHERE enabled = TRUE;

-- Analytics
CREATE INDEX idx_creator_analytics_creator ON creator_analytics_daily(creator_id, date DESC);
CREATE INDEX idx_platform_metrics_time     ON platform_metrics_hourly(snapshot_at DESC);
CREATE INDEX idx_user_activity_user        ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_user_activity_action      ON user_activity_log(action, created_at DESC);

-- Moderation
CREATE INDEX idx_reports_status            ON reports(status, created_at DESC);
CREATE INDEX idx_reports_reporter          ON reports(reporter_id);
CREATE INDEX idx_trust_signals_score       ON trust_signals(trust_score DESC);

-- Jobs
CREATE INDEX idx_job_queue_status          ON job_queue(queue, status, run_at) WHERE status IN ('pending','failed');
CREATE INDEX idx_job_queue_priority        ON job_queue(priority DESC, created_at) WHERE status = 'pending';


-- ─────────────────────────────────────────────────────────────────────────────
--  19. SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Interest categories (matches frontend AI_CATS)
INSERT INTO interest_categories (key, label, emoji, color, description, sort_order) VALUES
  ('tech',     'TECH VIBES',      '⚡', '#38BDF8', 'AI, Web3, DAOs, open source, build in public',        1),
  ('global',   'GLOBAL CONNECT',  '🌍', '#10F5A0', 'AgriTech, climate action, impact, global community',  2),
  ('creative', 'CREATIVE LEARN',  '🎨', '#FFB830', 'Generative art, design, culture, creator economy',   3),
  ('human',    'HUMAN POTENTIAL', '🧠', '#A78BFA', 'Learning, second brain, accountability, growth',      4),
  ('spaces',   'SPACES INVITE',   '🎙️', '#FF6B6B', 'Live audio rooms, AMAs, deep dive sessions',         5)
ON CONFLICT (key) DO NOTHING;

-- Explore topics (matches frontend ExplorePage)
INSERT INTO explore_topics (label, emoji, category, color, member_count, featured, sort_order) VALUES
  ('Tech Vibes',      '⚡', 'TECH_VIBES',      '#38BDF8', 4200, TRUE,  1),
  ('Global Connect',  '🌍', 'GLOBAL_CONNECT',  '#10F5A0', 9100, TRUE,  2),
  ('Creative Learn',  '🎨', 'CREATIVE_LEARN',  '#FFB830', 3800, TRUE,  3),
  ('Human Potential', '🧠', 'HUMAN_POTENTIAL', '#A78BFA', 6500, TRUE,  4),
  ('AgriTech',        '🌾', 'GLOBAL_CONNECT',  '#2DD4BF', 2100, FALSE, 5),
  ('DAO Governance',  '🏛️', 'TECH_VIBES',      '#FF6B6B', 1400, FALSE, 6)
ON CONFLICT DO NOTHING;

-- Community seed users (matches VIBE_USERS in frontend)
INSERT INTO users (id, email, handle, display_name, bio, avatar_color, avatar_initials, role_tag, verified, verification_tier, onboarding_done, onboarding_step, interests, password_hash)
VALUES
  ('00000000-0000-0000-0001-000000000001','aisha@vylapp.com',  'aisha.k',  'Aisha Kamara',  'Building Web3 governance toolkits for the people 🌱', '#10F5A0','AK','Tech Viber',        TRUE,'official', TRUE,'complete','{"tech","global"}',   '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000002','marcus@vylapp.com', 'marcus.o', 'Marcus Osei',   'DAO learner. Community first. 🔮',                     '#A78BFA','MO','DAO Learner',        TRUE,'community',TRUE,'complete','{"tech"}',             '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000003','jade@vylapp.com',   'jade.n',   'Jade Nakamura', 'Generative art × climate data 🎨',                     '#FFB830','JN','Creative Connector', TRUE,'creator',  TRUE,'complete','{"creative","human"}', '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000004','remi@vylapp.com',   'remi.k',   'Remi Kowalski', '10k farmers onboarded. Impact builder. 🌾',             '#FF6B6B','RK','Impact Builder',     FALSE,'none',    TRUE,'complete','{"global"}',           '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000005','tanvi@vylapp.com',  't.patel',  'Tanvi Patel',   'Human potential maximalist 🧠',                         '#A78BFA','TP','Human Potential',    FALSE,'none',    TRUE,'complete','{"human"}',            '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000006','leon@vylapp.com',   'l.chen',   'Leon Chen',     'AI explorer. Second brain architect. 🚀',               '#38BDF8','LC','AI Explorer',        TRUE,'community',TRUE,'complete','{"tech","human"}',    '$2a$12$placeholder'),
  ('00000000-0000-0000-0001-000000000007','sena@vylapp.com',   's.osei',   'Sena Osei',     'AgriTech learner. Growing the future. 🌿',              '#2DD4BF','SO','AgriTech Learner',   FALSE,'none',    TRUE,'complete','{"global"}',           '$2a$12$placeholder')
ON CONFLICT (id) DO NOTHING;

-- Default badges
INSERT INTO badges (key, label, description, icon, color) VALUES
  ('first_vibe',      'First Vibe',        'Posted your first vibe',                '⚡', '#7C3AED'),
  ('verified_member', 'Verified Member',   'Identity verified by Vylapp',           '✓',  '#10F5A0'),
  ('space_host',      'Space Host',        'Hosted your first live Space',          '🎙️', '#FF6B6B'),
  ('global_impact',   'Global Impact',     'Vibe reached 2k+ connections',          '🌍', '#10F5A0'),
  ('creator',         'Creator',           'Earned first $1 through creator tools', '🎨', '#FFB830'),
  ('100_connections', '100 Connections',   'Reached 100 connections',               '🤝', '#38BDF8'),
  ('vibe_streak_7',   '7-Day Vibe Streak', 'Posted every day for 7 days',           '🔥', '#FF6B6B'),
  ('pro_member',      'Pro Member',        'Subscribed to Vylapp Pro',              '⭐', '#A78BFA')
ON CONFLICT (key) DO NOTHING;

-- Default sticker pack
INSERT INTO sticker_packs (id, name, is_default) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Vylapp Basics', TRUE)
ON CONFLICT DO NOTHING;

-- Feature flags
INSERT INTO feature_flags (key, enabled, rollout_pct, description) VALUES
  ('translation_pro',       TRUE,  100, 'Real-time translation for Pro users'),
  ('paid_spaces',           TRUE,  100, 'Ticketed/paid Space rooms'),
  ('super_vibes',           TRUE,  100, 'Tip creators with Super Vibes'),
  ('creator_subs',          TRUE,  100, 'Creator subscription tiers'),
  ('autopilot_engine',      TRUE,  100, 'Local AI autopilot engine'),
  ('polls',                 TRUE,  100, 'Poll attachments on vibes'),
  ('close_friends',         TRUE,  100, 'Close friends list'),
  ('scheduled_vibes',       TRUE,  100, 'Schedule future vibes'),
  ('digital_products',      TRUE,  100, 'Sell digital products through Vylapp'),
  ('paid_dms',              FALSE, 0,   'Paid DM access (creator feature)'),
  ('video_spaces',          FALSE, 25,  'Video spaces (beta)'),
  ('collaborative_spaces',  FALSE, 10,  'Multi-host collaborative spaces')
ON CONFLICT (key) DO NOTHING;

-- App config defaults
INSERT INTO app_config (key, value, description) VALUES
  ('platform_fee_pct',           '20',                                     'Platform take rate for creator earnings (%)'),
  ('min_creator_payout_usd',     '50',                                     'Minimum creator payout threshold (USD)'),
  ('max_vibe_length',            '500',                                    'Maximum vibe character count'),
  ('max_media_per_vibe',         '4',                                      'Maximum media attachments per vibe'),
  ('free_stream_limit_mins',     '60',                                     'Free tier stream duration limit (minutes)'),
  ('pro_price_monthly_usd',      '9',                                      'Vylapp Pro monthly price (USD)'),
  ('pro_price_annual_usd',       '79',                                     'Vylapp Pro annual price (USD)'),
  ('trending_refresh_interval',  '"3600"',                                 'Trending topics refresh interval (seconds)'),
  ('feed_algorithm_version',     '"v2"',                                   'Active feed ranking algorithm version'),
  ('autopilot_max_posts_free',   '5',                                      'Max posts per autopilot run for free users'),
  ('autopilot_max_posts_pro',    '25',                                     'Max posts per autopilot run for Pro users'),
  ('supported_languages',        '["en","es","fr","ar","zh","pt","sw","hi","ja"]', 'Supported UI and translation languages')
ON CONFLICT (key) DO NOTHING;

-- Trending tags seed (matches VYL_TRENDS in frontend)
INSERT INTO trending_tags (tag, category, region, score, vibe_count, momentum, heat, headline) VALUES
  ('#DAOs',        'TECH_VIBES',      'Global', 8470, 847,  'peak',   88, 'DAO governance activity at all-time high with 200+ new orgs'),
  ('#AgriTech10k', 'GLOBAL_CONNECT',  'Africa', 2900, 2900, 'viral',  95, 'Remi Kowalski hits 10k farmers milestone across 5 African nations'),
  ('#ClimateArt',  'CREATIVE_LEARN',  'Global', 1300, 1300, 'rising', 78, 'AI climate data visualization goes mainstream in creative circles'),
  ('#SecondBrain', 'HUMAN_POTENTIAL', 'Global', 6340, 634,  'peak',   86, 'PKM tools cross 50M users globally as knowledge work evolves')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
--  END OF VYLAPP DATABASE SCHEMA
--  Tables: 76  |  Enums: 19  |  Triggers: 15  |  Functions: 10  |  Indexes: 70+
-- ════════════════════════════════════════════════════════════════════════════
