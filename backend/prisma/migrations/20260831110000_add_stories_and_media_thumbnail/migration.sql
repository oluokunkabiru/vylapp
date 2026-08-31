ALTER TABLE "media_assets" ADD COLUMN "thumbnail_url" TEXT;

CREATE TABLE "stories" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "caption" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "views_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "stories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stories_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "story_views" (
  "story_id" UUID NOT NULL,
  "viewer_id" UUID NOT NULL,
  "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_views_pkey" PRIMARY KEY ("story_id", "viewer_id"),
  CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "story_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_stories_active" ON "stories"("expires_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_stories_user" ON "stories"("user_id", "created_at" DESC);
CREATE INDEX "idx_story_views_viewer" ON "story_views"("viewer_id");
