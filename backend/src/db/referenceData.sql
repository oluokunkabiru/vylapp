-- ════════════════════════════════════════════════════════════════════════════
--  CORE REFERENCE DATA
--  Extracted verbatim from the original schema.sql / schema_forum.sql /
--  schema_rbac.sql seed sections (those files are now historical reference
--  only — DDL is tracked by Prisma migrations). This is REQUIRED data, not
--  demo content: RBAC has zero roles/permissions without it, forum has zero
--  categories, etc. Every statement here is already idempotent
--  (ON CONFLICT DO NOTHING / a guarded plpgsql helper), so it's safe to run
--  on every deploy.
-- ════════════════════════════════════════════════════════════════════════════

-- ── From schema.sql: interest_categories, explore_topics ──────────────────────
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

-- ── From schema.sql: badges, sticker_packs, feature_flags, app_config, trending_tags
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

-- ── From schema_forum.sql: forum_categories ────────────────────────────────────
-- Seed the base categories
INSERT INTO forum_categories (slug, name, description, topic_category, color, icon, sort_order) VALUES
  ('tech-vibes',      'Tech Vibes',       'DAOs, AI, Web3, and building in public',        'TECH_VIBES',      '#38BDF8', '⚡', 1),
  ('global-connect',  'Global Connect',   'AgriTech, diaspora, cross-border community',     'GLOBAL_CONNECT',  '#10F5A0', '🌍', 2),
  ('creative-learn',  'Creative Learn',   'Art, music, design, and creative education',     'CREATIVE_LEARN',  '#FFB830', '🎨', 3),
  ('human-potential', 'Human Potential',  'Learning systems, accountability, second brain', 'HUMAN_POTENTIAL', '#A78BFA', '🧠', 4),
  ('spaces-corner',   'Spaces Corner',    'Space announcements, replays, and discussions',  'SPACES_INVITE',   '#FF6B6B', '🎙️', 5),
  ('help-support',    'Help & Support',   'Questions, bugs, feature requests',              NULL,              '#4A4870', '💬', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── From schema_rbac.sql: roles, permissions, role_has_permissions seeding ─────
-- ═══════════════════════════════════════════════════════════════════════════
--  SEED DATA — ROLES
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO roles (name, description, is_system) VALUES
  ('super_admin',         'Full platform control. Cannot be removed from the last super_admin.', TRUE),
  ('platform_admin',      'Platform management: users, content, moderation. No system config.', TRUE),
  ('content_moderator',   'Global content review, flag resolution, and removal authority.',     FALSE),
  ('verified_educator',   'Can create and publish courses without review gate.',                FALSE),
  ('educator',            'Can create courses. Publish requires platform review.',              FALSE),
  ('creator',             'Monetization-enabled: subscriptions, Super Vibes, payouts.',        FALSE),
  ('community_moderator', 'Scoped: moderate threads and replies in an assigned community.',     FALSE),
  ('pro_subscriber',      'Pro plan holder: expanded limits, priority features.',              FALSE),
  ('restricted',          'Temporary restriction: reduced posting rights and rate limits.',    FALSE),
  ('user',                'Default role for all authenticated users.',                         TRUE)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
--  SEED DATA — PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Users group ───────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('users.read',           'View public user profiles',                         'users'),
  ('users.update.own',     'Update own profile fields',                         'users'),
  ('users.delete.own',     'Delete own account (GDPR)',                         'users'),
  ('users.ban',            'Ban or suspend other users',                        'users'),
  ('users.unban',          'Lift bans and suspensions',                         'users'),
  ('users.verify',         'Grant the verified checkmark',                      'users'),
  ('users.manage',         'Full user management (create, update, delete any)', 'users'),
  ('users.impersonate',    'Impersonate another user (support tool)',            'users')
ON CONFLICT (name) DO NOTHING;

-- ── Vibes group ───────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('vibes.create',         'Create new vibes',                                  'vibes'),
  ('vibes.read',           'Read/view vibes in the feed',                       'vibes'),
  ('vibes.update.own',     'Edit own vibes',                                    'vibes'),
  ('vibes.delete.own',     'Delete own vibes',                                  'vibes'),
  ('vibes.delete.any',     'Remove any vibe (moderation)',                      'vibes'),
  ('vibes.pin',            'Pin vibes to a community or profile',               'vibes'),
  ('vibes.feature',        'Feature vibes on the explore/discover surface',     'vibes')
ON CONFLICT (name) DO NOTHING;

-- ── Spaces group ──────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('spaces.join',          'Join any public Space',                             'spaces'),
  ('spaces.create',        'Start a new Space',                                 'spaces'),
  ('spaces.host',          'Host a Space with full controls',                   'spaces'),
  ('spaces.manage.own',    'Manage a Space you host',                           'spaces'),
  ('spaces.manage.any',    'Manage any Space on the platform',                  'spaces'),
  ('spaces.record',        'Record a Space for replay',                         'spaces')
ON CONFLICT (name) DO NOTHING;

-- ── Learn group ───────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('learn.enroll',         'Enroll in any published course',                    'learn'),
  ('learn.create',         'Create course drafts',                              'learn'),
  ('learn.update.own',     'Update own course content',                         'learn'),
  ('learn.publish.own',    'Publish own courses (no review gate)',               'learn'),
  ('learn.publish.any',    'Publish any course (admin override)',                'learn'),
  ('learn.review',         'Review and approve/reject pending courses',          'learn'),
  ('learn.delete.own',     'Archive or delete own courses',                     'learn'),
  ('learn.delete.any',     'Remove any course from the platform',               'learn'),
  ('learn.manage',         'Full course management including educator profiles', 'learn'),
  ('learn.certificates',   'Issue and revoke certificates',                     'learn')
ON CONFLICT (name) DO NOTHING;

-- ── Forum group ───────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('forum.thread.create',       'Post new forum threads',                         'forum'),
  ('forum.thread.update.own',   'Edit own threads',                               'forum'),
  ('forum.thread.delete.own',   'Delete own threads',                             'forum'),
  ('forum.thread.delete.any',   'Remove any thread (moderation)',                 'forum'),
  ('forum.thread.pin',          'Pin threads in a category',                      'forum'),
  ('forum.thread.lock',         'Lock threads (prevent new replies)',              'forum'),
  ('forum.reply.create',        'Reply to forum threads',                         'forum'),
  ('forum.reply.update.own',    'Edit own replies',                               'forum'),
  ('forum.reply.delete.own',    'Delete own replies',                             'forum'),
  ('forum.reply.delete.any',    'Remove any reply (moderation)',                  'forum'),
  ('forum.vote',                'Upvote and downvote threads and replies',         'forum'),
  ('forum.moderate',            'Full forum moderation in assigned communities',  'forum')
ON CONFLICT (name) DO NOTHING;

-- ── Creator economy group ─────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('creator.monetize',          'Enable monetization features on a profile',       'creator'),
  ('creator.payout',            'Request earnings payouts',                        'creator'),
  ('creator.analytics.own',     'View own creator analytics',                      'creator'),
  ('creator.analytics.any',     'View analytics for any creator',                  'creator'),
  ('creator.tiers.manage',      'Create and manage subscriber tiers',              'creator'),
  ('creator.manage',            'Manage any creator profile (admin)',               'creator')
ON CONFLICT (name) DO NOTHING;

-- ── Messaging group ───────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('messaging.dm',              'Send direct messages',                            'messaging'),
  ('messaging.group',           'Create group conversations',                      'messaging'),
  ('messaging.read.any',        'Read any private conversation (legal/support)',   'messaging'),
  ('messaging.broadcast',       'Send platform-wide broadcast messages',           'messaging')
ON CONFLICT (name) DO NOTHING;

-- ── Moderation group ──────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('moderation.review',         'Review the moderation queue',                     'moderation'),
  ('moderation.action',         'Take removal/throttle/warn actions',              'moderation'),
  ('moderation.appeal.review',  'Review user appeals against mod decisions',       'moderation'),
  ('moderation.escalate',       'Escalate items to senior moderation',             'moderation')
ON CONFLICT (name) DO NOTHING;

-- ── Notifications group ───────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('notifications.read.own',    'Read own notifications',                          'notifications'),
  ('notifications.send.system', 'Send platform-wide system notifications',        'notifications')
ON CONFLICT (name) DO NOTHING;

-- ── Admin group ───────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('admin.access',              'Access the admin dashboard',                      'admin'),
  ('admin.analytics',           'View platform-level analytics',                   'admin'),
  ('admin.users.manage',        'Full user management via admin panel',             'admin'),
  ('admin.content.manage',      'Full content management via admin panel',          'admin'),
  ('admin.roles.manage',        'Create, edit, delete roles and permissions',       'admin'),
  ('admin.system.config',       'Modify system configuration and feature flags',   'admin'),
  ('admin.audit.read',          'Read the full audit log',                         'admin')
ON CONFLICT (name) DO NOTHING;

-- ── Special wildcard permission ───────────────────────────────────────────────
INSERT INTO permissions (name, description, group_name) VALUES
  ('*', 'Super wildcard: grants every permission on the platform', 'system')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
--  SEED DATA — ROLE → PERMISSION ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: assign permissions to a role by name (safe — skips if already assigned)
CREATE OR REPLACE FUNCTION seed_role_permissions(p_role TEXT, VARIADIC p_perms TEXT[])
RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_perm    TEXT;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = p_role;
  IF v_role_id IS NULL THEN RETURN; END IF;
  FOREACH v_perm IN ARRAY p_perms LOOP
    SELECT id INTO v_perm_id FROM permissions WHERE name = v_perm;
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_has_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- super_admin: wildcard — all permissions
SELECT seed_role_permissions('super_admin', '*');

-- platform_admin: everything except system config and impersonation
SELECT seed_role_permissions('platform_admin',
  'users.read','users.ban','users.unban','users.verify','users.manage',
  'vibes.read','vibes.delete.any','vibes.pin','vibes.feature',
  'spaces.join','spaces.create','spaces.host','spaces.manage.any',
  'learn.enroll','learn.create','learn.publish.any','learn.review','learn.delete.any','learn.manage','learn.certificates',
  'forum.thread.create','forum.thread.delete.any','forum.thread.pin','forum.thread.lock',
  'forum.reply.create','forum.reply.delete.any','forum.vote','forum.moderate',
  'creator.analytics.any','creator.manage',
  'messaging.dm','messaging.group','messaging.broadcast',
  'moderation.review','moderation.action','moderation.appeal.review','moderation.escalate',
  'notifications.read.own','notifications.send.system',
  'admin.access','admin.analytics','admin.users.manage','admin.content.manage',
  'admin.roles.manage','admin.audit.read'
);

-- content_moderator: content review and action, no user management
SELECT seed_role_permissions('content_moderator',
  'users.read',
  'vibes.read','vibes.delete.any','vibes.pin',
  'forum.thread.delete.any','forum.thread.pin','forum.thread.lock',
  'forum.reply.delete.any','forum.vote','forum.moderate',
  'moderation.review','moderation.action','moderation.appeal.review','moderation.escalate',
  'admin.access','admin.audit.read'
);

-- verified_educator: create + publish without review gate
SELECT seed_role_permissions('verified_educator',
  'users.read','users.update.own','users.delete.own',
  'vibes.create','vibes.read','vibes.update.own','vibes.delete.own',
  'spaces.join','spaces.create','spaces.host','spaces.manage.own','spaces.record',
  'learn.enroll','learn.create','learn.update.own','learn.publish.own','learn.delete.own',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.reply.create','forum.reply.update.own','forum.reply.delete.own','forum.vote',
  'creator.monetize','creator.payout','creator.analytics.own','creator.tiers.manage',
  'messaging.dm','messaging.group',
  'moderation.review',
  'notifications.read.own'
);

-- educator: create courses but must submit for review to publish
SELECT seed_role_permissions('educator',
  'users.read','users.update.own','users.delete.own',
  'vibes.create','vibes.read','vibes.update.own','vibes.delete.own',
  'spaces.join','spaces.create','spaces.host','spaces.manage.own',
  'learn.enroll','learn.create','learn.update.own','learn.delete.own',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.reply.create','forum.reply.update.own','forum.reply.delete.own','forum.vote',
  'creator.analytics.own',
  'messaging.dm','messaging.group',
  'notifications.read.own'
);

-- creator: social + monetization, no course creation
SELECT seed_role_permissions('creator',
  'users.read','users.update.own','users.delete.own',
  'vibes.create','vibes.read','vibes.update.own','vibes.delete.own',
  'spaces.join','spaces.create','spaces.host','spaces.manage.own','spaces.record',
  'learn.enroll',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.reply.create','forum.reply.update.own','forum.reply.delete.own','forum.vote',
  'creator.monetize','creator.payout','creator.analytics.own','creator.tiers.manage',
  'messaging.dm','messaging.group',
  'notifications.read.own'
);

-- community_moderator: scoped moderation (effective only with scope assignment)
SELECT seed_role_permissions('community_moderator',
  'users.read',
  'vibes.read',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.thread.delete.any','forum.thread.pin','forum.thread.lock',
  'forum.reply.create','forum.reply.delete.own','forum.reply.delete.any','forum.vote',
  'forum.moderate',
  'moderation.review','moderation.action',
  'notifications.read.own'
);

-- pro_subscriber: expanded standard user capabilities
SELECT seed_role_permissions('pro_subscriber',
  'users.read','users.update.own','users.delete.own',
  'vibes.create','vibes.read','vibes.update.own','vibes.delete.own',
  'spaces.join','spaces.create','spaces.host','spaces.manage.own','spaces.record',
  'learn.enroll',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.reply.create','forum.reply.update.own','forum.reply.delete.own','forum.vote',
  'messaging.dm','messaging.group',
  'notifications.read.own'
);

-- restricted: minimal permissions — can read but not post
SELECT seed_role_permissions('restricted',
  'users.read',
  'vibes.read',
  'learn.enroll',
  'notifications.read.own'
);

-- user (default): standard authenticated user
SELECT seed_role_permissions('user',
  'users.read','users.update.own','users.delete.own',
  'vibes.create','vibes.read','vibes.update.own','vibes.delete.own',
  'spaces.join','spaces.create','spaces.host','spaces.manage.own',
  'learn.enroll',
  'forum.thread.create','forum.thread.update.own','forum.thread.delete.own',
  'forum.reply.create','forum.reply.update.own','forum.reply.delete.own','forum.vote',
  'messaging.dm',
  'notifications.read.own'
);
