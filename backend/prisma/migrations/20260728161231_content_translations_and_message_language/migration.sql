-- Adds language tracking to messages (parity with vibes/forum threads) and
-- a generic translation cache for non-vibe content types.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS "content_translations" (
  "content_type" TEXT NOT NULL,
  "content_id"   UUID NOT NULL,
  "target_lang"  TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "method"       TEXT NOT NULL,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "content_translations_pkey" PRIMARY KEY ("content_type", "content_id", "target_lang")
);
