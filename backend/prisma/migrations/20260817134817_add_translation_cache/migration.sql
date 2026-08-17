-- T-01: translation cache keyed on source text hash + target language
CREATE TABLE "translation_cache" (
    "text_hash" TEXT NOT NULL,
    "target_lang" TEXT NOT NULL,
    "source_lang" TEXT,
    "content" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("text_hash","target_lang")
);
