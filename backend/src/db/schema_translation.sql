-- ─────────────────────────────────────────────────────────────────────────────
--  TRANSLATION CACHE & USAGE
--
--  Backs automatic feed translation (see vibes.routes.js). A vibe is
--  translated into a given target language once, cached here, and served
--  from cache to every subsequent viewer — this is what makes free-tier
--  auto-translation affordable: the AI call happens once per (vibe, lang)
--  pair, not once per viewer.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vibe_translations (
  vibe_id     UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  target_lang TEXT NOT NULL,
  content     TEXT NOT NULL,
  method      TEXT NOT NULL,   -- 'dictionary' | 'claude' | 'untranslated'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vibe_id, target_lang)
);

-- Per-user daily counter for AI-quality (Claude) translations, so free-tier
-- usage can be capped without blocking the dictionary/cache paths.
CREATE TABLE IF NOT EXISTS translation_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     DATE NOT NULL DEFAULT CURRENT_DATE,
  count   INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
