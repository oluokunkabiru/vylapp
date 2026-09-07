-- S (rest): muted words per language + moderation appeals.
CREATE TYPE "appeal_status" AS ENUM ('pending', 'upheld', 'overturned');

CREATE TABLE "muted_words" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "language" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "muted_words_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "muted_words_user_id_word_key" ON "muted_words"("user_id", "word");
CREATE INDEX "idx_muted_words_user" ON "muted_words"("user_id");
ALTER TABLE "muted_words" ADD CONSTRAINT "muted_words_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "moderation_appeals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "moderation_action_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "appeal_status" NOT NULL DEFAULT 'pending',
    "decision" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "moderation_appeals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "moderation_appeals_moderation_action_id_key" ON "moderation_appeals"("moderation_action_id");
CREATE INDEX "idx_appeals_status" ON "moderation_appeals"("status", "created_at");
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_moderation_action_id_fkey"
    FOREIGN KEY ("moderation_action_id") REFERENCES "moderation_actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
