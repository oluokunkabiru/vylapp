-- ─────────────────────────────────────────────────────────────────────────────
--  STRUCTURED LOCATION
--
--  Splits "location" into two distinct signals that diaspora discovery
--  actually needs: where someone lives now vs. where they're from
--  culturally. Conflating these into the old free-text `location` column
--  is why nothing could ever be built on it (see onboarding.routes.js and
--  users.routes.js GET /discover).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_country TEXT;        -- ISO 3166-1 alpha-2
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS heritage_countries TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_current_country ON users(current_country);
CREATE INDEX IF NOT EXISTS idx_users_heritage_countries ON users USING GIN(heritage_countries);

ALTER TYPE onboarding_step ADD VALUE IF NOT EXISTS 'location' AFTER 'avatar';
