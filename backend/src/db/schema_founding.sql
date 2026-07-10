-- ─────────────────────────────────────────────────────────────────────────────
--  FOUNDING MEMBER STATUS
--
--  A permanent, unforgeable flag set once at registration if the user is
--  among the first 1000 accounts ever created — backs the "Founding Raven"
--  85% revenue-share promise (see creatorEconomyEngine.js) with a real,
--  queryable fact instead of copy nobody's account actually satisfies.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founding_rank INT;
