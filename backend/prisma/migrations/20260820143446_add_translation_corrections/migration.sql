-- T-21/T-22: native-speaker corrections against a specific cached translation
CREATE TABLE "translation_corrections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "text_hash" TEXT NOT NULL,
    "target_lang" TEXT NOT NULL,
    "source_text" TEXT NOT NULL,
    "original_translation" TEXT NOT NULL,
    "suggested_text" TEXT NOT NULL,
    "submitted_by" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "translation_corrections_text_hash_target_lang_idx" ON "translation_corrections"("text_hash", "target_lang");
CREATE INDEX "translation_corrections_status_idx" ON "translation_corrections"("status");

ALTER TABLE "translation_corrections" ADD CONSTRAINT "translation_corrections_submitted_by_fkey"
    FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
