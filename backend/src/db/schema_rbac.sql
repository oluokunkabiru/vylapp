-- ════════════════════════════════════════════════════════════════════════════
--  VYLAPP RBAC SCHEMA  (migration: rbac_v1)
--
--  DESIGN DECISIONS:
--
--  1. FLAT PERMISSION MODEL — no role inheritance.
--     Role inheritance (parent → child) sounds clean; it creates recursive
--     permission resolution that is hard to audit and easy to exploit.
--     Every role's permissions are explicit and fully enumerable.
--
--  2. COMMUNITY SCOPING on role assignments.
--     A user can be community_moderator in Tech Vibes but a plain user in
--     Global Connect. scope_type='community' + scope_id=category_id achieves
--     this. scope_id='' (empty string) means global — NULL cannot be used in
--     PRIMARY KEY without COALESCE tricks.
--
--  3. DIRECT PERMISSIONS on users.
--     A user can be given a permission directly, bypassing roles. Useful for
--     one-off grants (e.g. a verified educator who needs learn.publish.own
--     before the full verified_educator role is assigned).
--
--  4. PERMISSION NAMING: dot-notation, resource.action[.scope]
--     Examples: vibes.create, vibes.delete.any, admin.users.manage
--     Wildcard: vibes.* grants all vibes.* permissions.
--     Super wildcard: * grants everything (super_admin only).
--
--  5. EXPIRY on role assignments.
--     A community moderator role can expire. A temporary ban can be a
--     time-limited restricted role. NULL expires_at = permanent.
--
--  6. AUDIT TRAIL — assigned_by on all pivot tables.
--     Every role grant is attributed to who made it. Non-negotiable for a
--     platform with community moderators and creator payouts.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,           -- 'super_admin', 'educator', 'user'
  guard       TEXT NOT NULL DEFAULT 'web',    -- future: 'api' guard if needed
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE, -- system roles: cannot be deleted or renamed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Permissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,           -- 'vibes.create', 'admin.users.manage'
  guard       TEXT NOT NULL DEFAULT 'web',
  description TEXT,
  group_name  TEXT,                           -- 'vibes', 'admin', 'learn', 'forum'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Role → Permission assignments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_has_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_rhp_role       ON role_has_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rhp_permission ON role_has_permissions(permission_id);

-- ── User → Role assignments (with optional community scope) ───────────────────
-- scope_type: NULL/'' = global, 'community' = scoped to a forum category
-- scope_id:   '' = global, otherwise the UUID of the scoped entity (as text)
CREATE TABLE IF NOT EXISTS user_has_roles (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_type  TEXT NOT NULL DEFAULT '',       -- '' = global, 'community' = community-scoped
  scope_id    TEXT NOT NULL DEFAULT '',       -- '' = global, else entity uuid as text
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,                    -- NULL = permanent
  PRIMARY KEY (user_id, role_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_uhr_user   ON user_has_roles(user_id, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_uhr_role   ON user_has_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_uhr_expiry ON user_has_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ── User → Permission direct assignments (bypasses roles) ─────────────────────
-- Same scoping model as user_has_roles.
CREATE TABLE IF NOT EXISTS user_has_permissions (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope_type    TEXT NOT NULL DEFAULT '',
  scope_id      TEXT NOT NULL DEFAULT '',
  assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, permission_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_uhp_user       ON user_has_permissions(user_id, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_uhp_permission ON user_has_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_uhp_expiry     ON user_has_permissions(expires_at) WHERE expires_at IS NOT NULL;

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
