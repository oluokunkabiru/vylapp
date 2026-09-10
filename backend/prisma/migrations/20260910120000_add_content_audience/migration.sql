ALTER TABLE "vibes" ADD COLUMN "content_audience" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_content_audience_check" CHECK ("content_audience" IN ('kids', 'general', 'adult'));
CREATE INDEX "vibes_content_audience_created_at_idx" ON "vibes" ("content_audience", "created_at");
