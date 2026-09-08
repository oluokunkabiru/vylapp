-- Feed comments/replies are a separate capability from publishing top-level
-- vibes. This also repairs the baseline role assignment for legacy accounts
-- created before registration began assigning the default `user` role.

INSERT INTO roles (name, description, is_system)
VALUES ('user', 'Default role for all authenticated users.', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description, group_name)
VALUES ('vibes.reply', 'Comment on or reply to vibes', 'vibes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_has_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN (
  'platform_admin',
  'content_moderator',
  'verified_educator',
  'educator',
  'creator',
  'community_moderator',
  'pro_subscriber',
  'user'
)
AND p.name = 'vibes.reply'
ON CONFLICT DO NOTHING;

-- Every normal account has the baseline user role. Do not grant it to an
-- account carrying the restricted role, since RBAC grants are additive and
-- that would restore the posting permissions the restriction removes.
INSERT INTO user_has_roles (user_id, role_id, scope_type, scope_id)
SELECT u.id, base_role.id, '', ''
FROM users u
CROSS JOIN roles base_role
WHERE base_role.name = 'user'
  AND NOT EXISTS (
    SELECT 1
    FROM user_has_roles existing
    JOIN roles existing_role ON existing_role.id = existing.role_id
    WHERE existing.user_id = u.id
      AND existing.scope_type = ''
      AND existing.scope_id = ''
      AND existing_role.name = 'restricted'
      AND (existing.expires_at IS NULL OR existing.expires_at > NOW())
  )
ON CONFLICT DO NOTHING;
