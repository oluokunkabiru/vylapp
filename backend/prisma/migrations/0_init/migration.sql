-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('local', 'google', 'apple', 'twitter', 'linkedin');

-- CreateEnum
CREATE TYPE "autopilot_status" AS ENUM ('idle', 'scanning', 'posting', 'engaging', 'replying', 'complete', 'stopped', 'error');

-- CreateEnum
CREATE TYPE "conversation_type" AS ENUM ('dm', 'group', 'space_chat', 'broadcast');

-- CreateEnum
CREATE TYPE "course_status" AS ENUM ('draft', 'pending_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "educator_status" AS ENUM ('pending', 'community', 'verified', 'suspended');

-- CreateEnum
CREATE TYPE "enrolment_status" AS ENUM ('active', 'completed', 'dropped', 'expired');

-- CreateEnum
CREATE TYPE "feed_category" AS ENUM ('TECH_VIBES', 'GLOBAL_CONNECT', 'CREATIVE_LEARN', 'HUMAN_POTENTIAL', 'SPACES_INVITE', 'GENERAL');

-- CreateEnum
CREATE TYPE "forum_mod_role" AS ENUM ('moderator', 'senior_moderator', 'community_admin');

-- CreateEnum
CREATE TYPE "lesson_type" AS ENUM ('video', 'article', 'quiz', 'live_session', 'interactive');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('image', 'video', 'audio', 'document', 'gif');

-- CreateEnum
CREATE TYPE "message_content_type" AS ENUM ('text', 'image', 'video', 'audio', 'file', 'vibe_share', 'space_invite', 'sticker', 'reaction_burst');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('like', 'repost', 'reply', 'mention', 'follow', 'connection_request', 'space_invite', 'space_live', 'space_reminder', 'dm', 'group_message', 'creator_tip', 'creator_sub', 'creator_milestone', 'pro_renewal', 'pro_trial', 'autopilot_posted', 'autopilot_cycle_done', 'content_moderation', 'badge_earned', 'system');

-- CreateEnum
CREATE TYPE "onboarding_step" AS ENUM ('welcome', 'interests', 'handle', 'avatar', 'location', 'follow_suggestions', 'complete');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'harassment', 'misinformation', 'explicit_content', 'hate_speech', 'violence', 'copyright', 'impersonation', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'under_review', 'resolved_action', 'resolved_no_action', 'dismissed');

-- CreateEnum
CREATE TYPE "space_role" AS ENUM ('host', 'co_host', 'speaker', 'listener', 'muted_speaker');

-- CreateEnum
CREATE TYPE "space_status" AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('free', 'pro_monthly', 'pro_annual', 'creator', 'business');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'cancelled', 'expired', 'trial', 'paused');

-- CreateEnum
CREATE TYPE "thread_status" AS ENUM ('pending', 'active', 'locked', 'archived', 'removed');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('super_vibe', 'creator_subscription', 'space_ticket', 'digital_product', 'paid_dm', 'tip', 'pro_subscription', 'refund');

-- CreateEnum
CREATE TYPE "trend_momentum" AS ENUM ('emerging', 'rising', 'peak', 'viral', 'declining');

-- CreateEnum
CREATE TYPE "verification_tier" AS ENUM ('none', 'community', 'creator', 'official', 'partner');

-- CreateEnum
CREATE TYPE "vote_value" AS ENUM ('up', 'down');

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "autopilot_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "run_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "commenter_viber_id" TEXT NOT NULL,
    "commenter_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL DEFAULT 'positive',
    "simulated_likes" INTEGER NOT NULL DEFAULT 0,
    "auto_replied" BOOLEAN NOT NULL DEFAULT false,
    "reply_content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autopilot_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autopilot_configs" (
    "user_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_post" BOOLEAN NOT NULL DEFAULT true,
    "auto_engage" BOOLEAN NOT NULL DEFAULT true,
    "auto_reply" BOOLEAN NOT NULL DEFAULT true,
    "post_interval_secs" INTEGER NOT NULL DEFAULT 6,
    "reply_delay_secs" INTEGER NOT NULL DEFAULT 3,
    "max_posts_per_run" INTEGER NOT NULL DEFAULT 8,
    "active_categories" TEXT[] DEFAULT ARRAY['tech', 'global', 'creative', 'human', 'spaces']::TEXT[],
    "persona_viber_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autopilot_configs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "autopilot_runs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "status" "autopilot_status" NOT NULL DEFAULT 'idle',
    "posts_generated" INTEGER NOT NULL DEFAULT 0,
    "replies_generated" INTEGER NOT NULL DEFAULT 0,
    "topics_scanned" INTEGER NOT NULL DEFAULT 0,
    "total_likes_est" INTEGER NOT NULL DEFAULT 0,
    "total_reposts_est" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "autopilot_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autopilot_schedules" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "preset_name" TEXT NOT NULL DEFAULT 'peak',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autopilot_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autopilot_topics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "run_id" UUID NOT NULL,
    "category" "feed_category" NOT NULL,
    "topic" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "heat" INTEGER NOT NULL DEFAULT 50,
    "region" TEXT NOT NULL DEFAULT 'Global',
    "momentum" "trend_momentum" NOT NULL DEFAULT 'rising',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "vibe_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autopilot_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "course_title" TEXT NOT NULL,
    "educator_name" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoint_responses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "checkpoint_id" UUID NOT NULL,
    "selected_option" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "responded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoint_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "close_connections" (
    "user_id" UUID NOT NULL,
    "friend_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "close_connections_pkey" PRIMARY KEY ("user_id","friend_id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("user_id","category_id")
);

-- CreateTable
CREATE TABLE "community_moderators" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "forum_mod_role" NOT NULL DEFAULT 'moderator',
    "assigned_by" UUID NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{"pin": false, "lock": true, "warn": true, "remove": true}',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "community_moderators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "requester_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "notify_posts" BOOLEAN NOT NULL DEFAULT true,
    "notify_spaces" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "content_filters" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phrase" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'flag',
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "nickname" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMPTZ(6),
    "muted_until" TIMESTAMPTZ(6),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "conversation_type" NOT NULL DEFAULT 'dm',
    "name" TEXT,
    "description" TEXT,
    "color" TEXT,
    "avatar_url" TEXT,
    "created_by" UUID,
    "space_id" UUID,
    "last_message_id" UUID,
    "last_message_at" TIMESTAMPTZ(6),
    "last_message_preview" TEXT,
    "is_announcement" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrolments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "enrolment_status" NOT NULL DEFAULT 'active',
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "lessons_done" INTEGER NOT NULL DEFAULT 0,
    "stripe_payment_intent_id" TEXT,
    "amount_paid_usd" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "course_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_ratings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "educator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "status" "course_status" NOT NULL DEFAULT 'draft',
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price_usd" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "cover_image_url" TEXT,
    "preview_video_url" TEXT,
    "estimated_hours" DECIMAL(4,1),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enrolment_count" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "stripe_product_id" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_analytics_daily" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "creator_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "new_followers" INTEGER NOT NULL DEFAULT 0,
    "lost_followers" INTEGER NOT NULL DEFAULT 0,
    "profile_views" INTEGER NOT NULL DEFAULT 0,
    "vibe_impressions" INTEGER NOT NULL DEFAULT 0,
    "vibe_likes" INTEGER NOT NULL DEFAULT 0,
    "vibe_reposts" INTEGER NOT NULL DEFAULT 0,
    "space_listeners" INTEGER NOT NULL DEFAULT 0,
    "space_minutes" INTEGER NOT NULL DEFAULT 0,
    "earnings_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "new_subscribers" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_payouts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "creator_id" UUID NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "stripe_payout_id" TEXT,
    "stripe_account_id" TEXT,
    "status" "payout_status" NOT NULL DEFAULT 'pending',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "user_id" UUID NOT NULL,
    "bio_extended" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "social_links" JSONB DEFAULT '{}',
    "stripe_account_id" TEXT,
    "stripe_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "payout_schedule" TEXT DEFAULT 'weekly',
    "minimum_payout_usd" DECIMAL(8,2) DEFAULT 50,
    "total_earned_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_withdrawn_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pending_balance_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subscriber_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "creator_subscription_tiers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "creator_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_usd" DECIMAL(8,2) NOT NULL,
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "perks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_subscribers" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscriber_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "price_usd" DECIMAL(8,2) NOT NULL,
    "stripe_subscription_id" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_product_purchases" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "price_usd" DECIMAL(8,2) NOT NULL,
    "platform_fee_usd" DECIMAL(8,2) NOT NULL,
    "creator_net_usd" DECIMAL(8,2) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "max_downloads" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_product_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "creator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preview_url" TEXT,
    "file_url" TEXT,
    "file_type" TEXT,
    "file_size_bytes" BIGINT,
    "price_usd" DECIMAL(8,2) NOT NULL,
    "purchases_count" INTEGER NOT NULL DEFAULT 0,
    "revenue_total_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educator_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "credentials" JSONB NOT NULL DEFAULT '[]',
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages_taught" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "status" "educator_status" NOT NULL DEFAULT 'community',
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "total_courses" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "new_email" CITEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explore_topics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "category" "feed_category" NOT NULL,
    "color" TEXT NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explore_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_pct" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_grants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "granted_by" UUID,
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'following',
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "topic_category" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "thread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_threads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "thread_status" NOT NULL DEFAULT 'pending',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_announcement" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "vote_score" INTEGER NOT NULL DEFAULT 0,
    "last_reply_at" TIMESTAMPTZ(6),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderation_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_votes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "thread_id" UUID,
    "reply_id" UUID,
    "value" "vote_value" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hashtags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tag" CITEXT NOT NULL,
    "vibes_count" INTEGER NOT NULL DEFAULT 0,
    "week_vibes_count" INTEGER NOT NULL DEFAULT 0,
    "day_vibes_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "queue" TEXT NOT NULL DEFAULT 'default',
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_checkpoints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lesson_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_option" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "language" TEXT NOT NULL DEFAULT 'en',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "creator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "course_count" INTEGER NOT NULL DEFAULT 0,
    "enrolment_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(5,1),
    "cover_image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_streaks" (
    "user_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ(6),
    "streak_frozen_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "lesson_completions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "score" INTEGER,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "time_spent_sec" INTEGER NOT NULL DEFAULT 0,
    "content_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "lesson_type" NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_free_preview" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "duration_minutes" INTEGER,
    "content_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "uploaded_by" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "cdn_key" TEXT NOT NULL,
    "media_type" "media_type" NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" UUID NOT NULL,
    "media_type" "media_type" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "size_bytes" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("message_id","user_id","emoji")
);

-- CreateTable
CREATE TABLE "message_reads" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("message_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT,
    "content_type" "message_content_type" NOT NULL DEFAULT 'text',
    "content_html" TEXT,
    "reply_to_id" UUID,
    "shared_vibe_id" UUID,
    "shared_space_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "edited_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "moderator_id" UUID NOT NULL,
    "target_user_id" UUID,
    "target_vibe_id" UUID,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "duration_hours" INTEGER,
    "report_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "email_likes" BOOLEAN NOT NULL DEFAULT true,
    "email_reposts" BOOLEAN NOT NULL DEFAULT true,
    "email_follows" BOOLEAN NOT NULL DEFAULT true,
    "email_mentions" BOOLEAN NOT NULL DEFAULT true,
    "email_dms" BOOLEAN NOT NULL DEFAULT true,
    "email_spaces" BOOLEAN NOT NULL DEFAULT true,
    "email_marketing" BOOLEAN NOT NULL DEFAULT false,
    "push_likes" BOOLEAN NOT NULL DEFAULT true,
    "push_reposts" BOOLEAN NOT NULL DEFAULT true,
    "push_follows" BOOLEAN NOT NULL DEFAULT true,
    "push_mentions" BOOLEAN NOT NULL DEFAULT true,
    "push_dms" BOOLEAN NOT NULL DEFAULT true,
    "push_spaces" BOOLEAN NOT NULL DEFAULT true,
    "in_app_all" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TIME(6),
    "quiet_hours_end" TIME(6),
    "quiet_hours_timezone" TEXT DEFAULT 'UTC',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "notification_type" NOT NULL,
    "vibe_id" UUID,
    "space_id" UUID,
    "message_id" UUID,
    "conversation_id" UUID,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "icon" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_pushed" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "group_key" TEXT,
    "group_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "state" TEXT NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "redirect_to" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "step" "onboarding_step" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_dm_access" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "payer_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "amount_usd" DECIMAL(8,2) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paid_dm_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_courses" (
    "path_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "path_courses_pkey" PRIMARY KEY ("path_id","course_id")
);

-- CreateTable
CREATE TABLE "path_enrolments" (
    "user_id" UUID NOT NULL,
    "path_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "path_enrolments_pkey" PRIMARY KEY ("user_id","path_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "guard" TEXT NOT NULL DEFAULT 'web',
    "description" TEXT,
    "group_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_metrics_hourly" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "snapshot_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "vibes_posted" INTEGER NOT NULL DEFAULT 0,
    "spaces_live" INTEGER NOT NULL DEFAULT 0,
    "space_listeners" INTEGER NOT NULL DEFAULT 0,
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "revenue_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "platform_metrics_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "price_usd" DECIMAL(8,2) NOT NULL,
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device_info" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reporter_id" UUID NOT NULL,
    "reported_vibe_id" UUID,
    "reported_user_id" UUID,
    "reported_space_id" UUID,
    "reported_message_id" UUID,
    "reason" "report_reason" NOT NULL,
    "detail" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "action_taken" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_has_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_has_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "guard" TEXT NOT NULL DEFAULT 'web',
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "filename" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("filename")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "result_type" TEXT,
    "clicked_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_cohosts" (
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "space_cohosts_pkey" PRIMARY KEY ("space_id","user_id")
);

-- CreateTable
CREATE TABLE "space_participant_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "space_role" NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "left_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_participant_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_participants" (
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "space_role" NOT NULL DEFAULT 'listener',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "was_speaker" BOOLEAN NOT NULL DEFAULT false,
    "tip_total_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "space_participants_pkey" PRIMARY KEY ("space_id","user_id")
);

-- CreateTable
CREATE TABLE "space_reminders" (
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_reminders_pkey" PRIMARY KEY ("space_id","user_id")
);

-- CreateTable
CREATE TABLE "space_speaker_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "space_speaker_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "price_usd" DECIMAL(8,2) NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "purchased_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refunded_at" TIMESTAMPTZ(6),

    CONSTRAINT "space_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_tips" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "space_id" UUID NOT NULL,
    "tipper_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "amount_usd" DECIMAL(8,2) NOT NULL,
    "message" TEXT,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "host_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "feed_category" NOT NULL DEFAULT 'GENERAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT DEFAULT '#7C3AED',
    "is_video" BOOLEAN NOT NULL DEFAULT false,
    "is_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_ticketed" BOOLEAN NOT NULL DEFAULT false,
    "ticket_price_usd" DECIMAL(8,2),
    "is_subscription_only" BOOLEAN NOT NULL DEFAULT false,
    "is_close_friends" BOOLEAN NOT NULL DEFAULT false,
    "status" "space_status" NOT NULL DEFAULT 'scheduled',
    "scheduled_for" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "listeners_count" INTEGER NOT NULL DEFAULT 0,
    "peak_listeners" INTEGER NOT NULL DEFAULT 0,
    "speakers_count" INTEGER NOT NULL DEFAULT 0,
    "total_tips_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "recording_url" TEXT,
    "recording_size_bytes" BIGINT,
    "transcript_url" TEXT,
    "translation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sticker_packs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "preview_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sticker_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stickers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pack_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_vibes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "vibe_id" UUID,
    "space_id" UUID,
    "amount_usd" DECIMAL(8,2) NOT NULL,
    "emoji" TEXT DEFAULT '⚡',
    "message" TEXT,
    "stripe_payment_intent_id" TEXT,
    "platform_fee_usd" DECIMAL(8,2) NOT NULL,
    "creator_net_usd" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_vibes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_replies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_reply_id" UUID,
    "body" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "vote_score" INTEGER NOT NULL DEFAULT 0,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "is_removed" BOOLEAN NOT NULL DEFAULT false,
    "moderation_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_tags" (
    "thread_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "thread_tags_pkey" PRIMARY KEY ("thread_id","tag_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "counterparty_id" UUID,
    "type" "transaction_type" NOT NULL,
    "direction" TEXT NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "platform_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_usd" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripe_payment_intent_id" TEXT,
    "stripe_charge_id" TEXT,
    "stripe_transfer_id" TEXT,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_usage" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL DEFAULT CURRENT_DATE,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "translation_usage_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "trending_tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tag" TEXT NOT NULL,
    "category" "feed_category",
    "region" TEXT,
    "score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "vibe_count" INTEGER NOT NULL DEFAULT 0,
    "velocity" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "momentum" "trend_momentum" NOT NULL DEFAULT 'rising',
    "heat" INTEGER NOT NULL DEFAULT 50,
    "headline" TEXT,
    "snapshot_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_signals" (
    "user_id" UUID NOT NULL,
    "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "spam_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "bot_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "last_calculated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_signals_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "two_factor_challenges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "user_feature_flags" (
    "user_id" UUID NOT NULL,
    "flag_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feature_flags_pkey" PRIMARY KEY ("user_id","flag_id")
);

-- CreateTable
CREATE TABLE "user_has_permissions" (
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT '',
    "scope_id" TEXT NOT NULL DEFAULT '',
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_has_permissions_pkey" PRIMARY KEY ("user_id","permission_id","scope_type","scope_id")
);

-- CreateTable
CREATE TABLE "user_has_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT '',
    "scope_id" TEXT NOT NULL DEFAULT '',
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_has_roles_pkey" PRIMARY KEY ("user_id","role_id","scope_type","scope_id")
);

-- CreateTable
CREATE TABLE "user_mutes" (
    "muter_id" UUID NOT NULL,
    "muted_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mutes_pkey" PRIMARY KEY ("muter_id","muted_id")
);

-- CreateTable
CREATE TABLE "user_topic_memberships" (
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_topic_memberships_pkey" PRIMARY KEY ("user_id","topic_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" CITEXT NOT NULL,
    "handle" CITEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "birthday" DATE,
    "language" TEXT DEFAULT 'en',
    "timezone" TEXT DEFAULT 'UTC',
    "avatar_color" TEXT NOT NULL DEFAULT '#7C3AED',
    "avatar_initials" TEXT NOT NULL DEFAULT 'VY',
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "role_tag" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_tier" "verification_tier" NOT NULL DEFAULT 'none',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_creator" BOOLEAN NOT NULL DEFAULT false,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "provider" "auth_provider" NOT NULL DEFAULT 'local',
    "provider_id" TEXT,
    "provider_token" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "recovery_codes" TEXT[],
    "online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen" TIMESTAMPTZ(6),
    "last_ip" INET,
    "onboarding_step" "onboarding_step" NOT NULL DEFAULT 'welcome',
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allow_dms" BOOLEAN NOT NULL DEFAULT true,
    "allow_paid_dms" BOOLEAN NOT NULL DEFAULT false,
    "paid_dm_price_usd" DECIMAL(8,2) DEFAULT 0,
    "content_language" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "translation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "translation_languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "private_account" BOOLEAN NOT NULL DEFAULT false,
    "hide_from_search" BOOLEAN NOT NULL DEFAULT false,
    "hide_connection_count" BOOLEAN NOT NULL DEFAULT false,
    "subscription_plan" "subscription_plan" NOT NULL DEFAULT 'free',
    "subscription_status" "subscription_status",
    "subscription_ends_at" TIMESTAMPTZ(6),
    "stripe_customer_id" TEXT,
    "vibes_count" INTEGER NOT NULL DEFAULT 0,
    "connections_count" INTEGER NOT NULL DEFAULT 0,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "spaces_hosted" INTEGER NOT NULL DEFAULT 0,
    "creator_earnings_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(6),
    "suspended_reason" TEXT,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "deactivated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_country" TEXT,
    "current_city" TEXT,
    "heritage_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_founding_member" BOOLEAN NOT NULL DEFAULT false,
    "founding_rank" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vibe_bookmarks" (
    "user_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_bookmarks_pkey" PRIMARY KEY ("user_id","vibe_id")
);

-- CreateTable
CREATE TABLE "vibe_event_reminders" (
    "user_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "reminded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_event_reminders_pkey" PRIMARY KEY ("user_id","vibe_id")
);

-- CreateTable
CREATE TABLE "vibe_likes" (
    "user_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_likes_pkey" PRIMARY KEY ("user_id","vibe_id")
);

-- CreateTable
CREATE TABLE "vibe_media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vibe_id" UUID NOT NULL,
    "media_type" "media_type" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "size_bytes" BIGINT,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vibe_poll_options" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "poll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vibe_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vibe_poll_votes" (
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_poll_votes_pkey" PRIMARY KEY ("user_id","poll_id")
);

-- CreateTable
CREATE TABLE "vibe_polls" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vibe_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "closes_at" TIMESTAMPTZ(6) NOT NULL,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vibe_reposts" (
    "user_id" UUID NOT NULL,
    "vibe_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_reposts_pkey" PRIMARY KEY ("user_id","vibe_id")
);

-- CreateTable
CREATE TABLE "vibe_translations" (
    "vibe_id" UUID NOT NULL,
    "target_lang" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_translations_pkey" PRIMARY KEY ("vibe_id","target_lang")
);

-- CreateTable
CREATE TABLE "vibe_views" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vibe_id" UUID NOT NULL,
    "viewer_id" UUID,
    "session_id" TEXT,
    "source" TEXT,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vibe_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vibes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "content_html" TEXT,
    "category" "feed_category" NOT NULL DEFAULT 'GENERAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT DEFAULT 'en',
    "reply_to" UUID,
    "repost_of" UUID,
    "quote_of" UUID,
    "thread_root_id" UUID,
    "thread_depth" INTEGER NOT NULL DEFAULT 0,
    "is_close_friends" BOOLEAN NOT NULL DEFAULT false,
    "is_paid_content" BOOLEAN NOT NULL DEFAULT false,
    "paid_content_price_usd" DECIMAL(8,2),
    "event_title" TEXT,
    "event_time" TEXT,
    "event_space_id" UUID,
    "event_reminded_count" INTEGER NOT NULL DEFAULT 0,
    "event_interested_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "reposts_count" INTEGER NOT NULL DEFAULT 0,
    "replies_count" INTEGER NOT NULL DEFAULT 0,
    "quotes_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "bookmarks_count" INTEGER NOT NULL DEFAULT 0,
    "is_autopilot" BOOLEAN NOT NULL DEFAULT false,
    "autopilot_run_id" UUID,
    "autopilot_topic" TEXT,
    "autopilot_trend_heat" INTEGER,
    "autopilot_momentum" "trend_momentum",
    "impact_badge" TEXT,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "moderation_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at" TIMESTAMPTZ(6),

    CONSTRAINT "vibes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_fired" TIMESTAMPTZ(6),
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_audit_created" ON "admin_audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_autopilot_comments_vibe" ON "autopilot_comments"("vibe_id");

-- CreateIndex
CREATE INDEX "idx_autopilot_runs_user" ON "autopilot_runs"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_autopilot_schedules_next" ON "autopilot_schedules"("next_run_at") WHERE (enabled = true);

-- CreateIndex
CREATE INDEX "idx_autopilot_schedules_user" ON "autopilot_schedules"("user_id") WHERE (enabled = true);

-- CreateIndex
CREATE INDEX "idx_autopilot_topics_run" ON "autopilot_topics"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE INDEX "idx_certificates_user" ON "certificates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_course_id_key" ON "certificates"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_responses_checkpoint" ON "checkpoint_responses"("checkpoint_id");

-- CreateIndex
CREATE INDEX "idx_responses_user" ON "checkpoint_responses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkpoint_responses_user_id_checkpoint_id_key" ON "checkpoint_responses"("user_id", "checkpoint_id");

-- CreateIndex
CREATE INDEX "idx_memberships_category" ON "community_memberships"("category_id", "status");

-- CreateIndex
CREATE INDEX "idx_mod_category" ON "community_moderators"("category_id");

-- CreateIndex
CREATE INDEX "idx_mod_user" ON "community_moderators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_moderators_category_id_user_id_key" ON "community_moderators"("category_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "connection_requests_requester_id_target_id_key" ON "connection_requests"("requester_id", "target_id");

-- CreateIndex
CREATE INDEX "idx_connections_follower" ON "connections"("follower_id");

-- CreateIndex
CREATE INDEX "idx_connections_following" ON "connections"("following_id");

-- CreateIndex
CREATE INDEX "idx_conv_members_conv" ON "conversation_members"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_conv_members_user" ON "conversation_members"("user_id", "last_read_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conv_updated" ON "conversations"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_enrolments_course" ON "course_enrolments"("course_id", "status");

-- CreateIndex
CREATE INDEX "idx_enrolments_user" ON "course_enrolments"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrolments_user_id_course_id_key" ON "course_enrolments"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_ratings_course" ON "course_ratings"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_ratings_user_id_course_id_key" ON "course_ratings"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_courses_category" ON "courses"("category");

-- CreateIndex
CREATE INDEX "idx_courses_educator" ON "courses"("educator_id");

-- CreateIndex
CREATE INDEX "idx_courses_is_free" ON "courses"("is_free");

-- CreateIndex
CREATE INDEX "idx_courses_language" ON "courses"("language");

-- CreateIndex
CREATE INDEX "idx_courses_status" ON "courses"("status");

-- CreateIndex
CREATE INDEX "idx_courses_tags" ON "courses" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_creator_analytics_creator" ON "creator_analytics_daily"("creator_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "creator_analytics_daily_creator_id_date_key" ON "creator_analytics_daily"("creator_id", "date");

-- CreateIndex
CREATE INDEX "idx_creator_payouts_creator" ON "creator_payouts"("creator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_stripe_account_id_key" ON "creator_profiles"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_subscriptions_stripe_subscription_id_key" ON "creator_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_creator_subs_creator" ON "creator_subscriptions"("creator_id", "status");

-- CreateIndex
CREATE INDEX "idx_creator_subs_subscriber" ON "creator_subscriptions"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_subscriptions_subscriber_id_creator_id_key" ON "creator_subscriptions"("subscriber_id", "creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "digital_product_purchases_product_id_buyer_id_key" ON "digital_product_purchases"("product_id", "buyer_id");

-- CreateIndex
CREATE INDEX "idx_digital_products_creator" ON "digital_products"("creator_id") WHERE (active = true);

-- CreateIndex
CREATE UNIQUE INDEX "educator_profiles_user_id_key" ON "educator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_educator_profiles_status" ON "educator_profiles"("status");

-- CreateIndex
CREATE INDEX "idx_educator_profiles_subjects" ON "educator_profiles" USING GIN ("subjects");

-- CreateIndex
CREATE INDEX "idx_educator_profiles_user" ON "educator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "idx_feed_items_user" ON "feed_items"("user_id", "score" DESC, "seen");

-- CreateIndex
CREATE UNIQUE INDEX "feed_items_user_id_vibe_id_key" ON "feed_items"("user_id", "vibe_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

-- CreateIndex
CREATE INDEX "idx_forum_cats_parent" ON "forum_categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_forum_cats_topic" ON "forum_categories"("topic_category");

-- CreateIndex
CREATE UNIQUE INDEX "forum_tags_slug_key" ON "forum_tags"("slug");

-- CreateIndex
CREATE INDEX "idx_threads_author" ON "forum_threads"("author_id");

-- CreateIndex
CREATE INDEX "idx_threads_category" ON "forum_threads"("category_id", "status", "is_pinned" DESC, "last_reply_at" DESC);

-- CreateIndex
CREATE INDEX "idx_threads_pinned" ON "forum_threads"("is_pinned") WHERE (is_pinned = true);

-- CreateIndex
CREATE INDEX "idx_threads_status" ON "forum_threads"("status");

-- CreateIndex
CREATE INDEX "idx_threads_tags" ON "forum_threads" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_threads_vote_score" ON "forum_threads"("vote_score" DESC);

-- CreateIndex
CREATE INDEX "idx_votes_reply" ON "forum_votes"("reply_id");

-- CreateIndex
CREATE INDEX "idx_votes_thread" ON "forum_votes"("thread_id");

-- CreateIndex
CREATE INDEX "idx_votes_user" ON "forum_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_reply_id_key" ON "forum_votes"("user_id", "reply_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_thread_id_key" ON "forum_votes"("user_id", "thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_tag_key" ON "hashtags"("tag");

-- CreateIndex
CREATE INDEX "idx_hashtags_count" ON "hashtags"("vibes_count" DESC);

-- CreateIndex
CREATE INDEX "idx_hashtags_day" ON "hashtags"("day_vibes_count" DESC);

-- CreateIndex
CREATE INDEX "idx_hashtags_tag" ON "hashtags"("tag");

-- CreateIndex
CREATE INDEX "idx_hashtags_week" ON "hashtags"("week_vibes_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "interest_categories_key_key" ON "interest_categories"("key");

-- CreateIndex
CREATE INDEX "idx_job_queue_priority" ON "job_queue"("priority" DESC, "created_at") WHERE (status = 'pending'::text);

-- CreateIndex
CREATE INDEX "idx_job_queue_status" ON "job_queue"("queue", "status", "run_at") WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));

-- CreateIndex
CREATE INDEX "idx_checkpoints_lesson" ON "knowledge_checkpoints"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_paths_category" ON "learning_paths"("category");

-- CreateIndex
CREATE INDEX "idx_paths_creator" ON "learning_paths"("creator_id");

-- CreateIndex
CREATE INDEX "idx_paths_official" ON "learning_paths"("is_official");

-- CreateIndex
CREATE INDEX "idx_completions_completed" ON "lesson_completions"("completed_at") WHERE (completed_at IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_completions_course" ON "lesson_completions"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_completions_user" ON "lesson_completions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_completions_user_id_lesson_id_key" ON "lesson_completions"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_lessons_course" ON "lessons"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_lessons_type" ON "lessons"("type");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_cdn_key_key" ON "media_assets"("cdn_key");

-- CreateIndex
CREATE INDEX "idx_message_reactions_msg" ON "message_reactions"("message_id");

-- CreateIndex
CREATE INDEX "idx_message_reads_msg" ON "message_reads"("message_id");

-- CreateIndex
CREATE INDEX "idx_message_reads_user" ON "message_reads"("user_id");

-- CreateIndex
CREATE INDEX "idx_messages_conv" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_notifications_group" ON "notifications"("user_id", "group_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_unread" ON "notifications"("user_id", "is_read", "created_at" DESC) WHERE (is_read = false);

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "idx_path_enrolments_user" ON "path_enrolments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "idx_platform_metrics_time" ON "platform_metrics_hourly"("snapshot_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_stripe_subscription_id_key" ON "platform_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_push_tokens_user" ON "push_tokens"("user_id") WHERE (active = true);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expiry" ON "refresh_tokens"("expires_at") WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_reports_reporter" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "idx_reports_status" ON "reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_rhp_permission" ON "role_has_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_rhp_role" ON "role_has_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_space_participants_space" ON "space_participants"("space_id");

-- CreateIndex
CREATE INDEX "idx_space_participants_user" ON "space_participants"("user_id");

-- CreateIndex
CREATE INDEX "idx_space_reminders_space" ON "space_reminders"("space_id");

-- CreateIndex
CREATE INDEX "idx_space_reminders_user" ON "space_reminders"("user_id");

-- CreateIndex
CREATE INDEX "idx_space_tips_recipient" ON "space_tips"("recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_space_tips_space" ON "space_tips"("space_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_spaces_host" ON "spaces"("host_id");

-- CreateIndex
CREATE INDEX "idx_spaces_live" ON "spaces"("listeners_count" DESC) WHERE (status = 'live'::space_status);

-- CreateIndex
CREATE INDEX "idx_spaces_scheduled" ON "spaces"("scheduled_for") WHERE (status = 'scheduled'::space_status);

-- CreateIndex
CREATE INDEX "idx_spaces_status" ON "spaces"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_super_vibes_recipient" ON "super_vibes"("recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_super_vibes_vibe" ON "super_vibes"("vibe_id") WHERE (vibe_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_replies_accepted" ON "thread_replies"("thread_id", "is_accepted") WHERE (is_accepted = true);

-- CreateIndex
CREATE INDEX "idx_replies_author" ON "thread_replies"("author_id");

-- CreateIndex
CREATE INDEX "idx_replies_parent" ON "thread_replies"("parent_reply_id");

-- CreateIndex
CREATE INDEX "idx_replies_thread" ON "thread_replies"("thread_id", "depth", "vote_score" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_tags_tag" ON "thread_tags"("tag_id");

-- CreateIndex
CREATE INDEX "idx_transactions_user" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_trending_tags_category" ON "trending_tags"("category", "heat" DESC);

-- CreateIndex
CREATE INDEX "idx_trending_tags_score" ON "trending_tags"("score" DESC, "snapshot_at" DESC);

-- CreateIndex
CREATE INDEX "idx_trust_signals_score" ON "trust_signals"("trust_score" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activity_action" ON "user_activity_log"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activity_user" ON "user_activity_log"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "idx_user_blocks_blocker" ON "user_blocks"("blocker_id");

-- CreateIndex
CREATE INDEX "idx_uhp_expiry" ON "user_has_permissions"("expires_at") WHERE (expires_at IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_uhp_permission" ON "user_has_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_uhp_user" ON "user_has_permissions"("user_id", "scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "idx_uhr_expiry" ON "user_has_roles"("expires_at") WHERE (expires_at IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_uhr_role" ON "user_has_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_uhr_user" ON "user_has_roles"("user_id", "scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "idx_user_mutes_muter" ON "user_mutes"("muter_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_users_created" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_users_current_country" ON "users"("current_country");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_handle" ON "users"("handle");

-- CreateIndex
CREATE INDEX "idx_users_heritage_countries" ON "users" USING GIN ("heritage_countries");

-- CreateIndex
CREATE INDEX "idx_users_not_deleted" ON "users"("id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_users_online" ON "users"("online") WHERE (online = true);

-- CreateIndex
CREATE INDEX "idx_users_provider" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "idx_users_search_handle" ON "users" USING GIN ("handle" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_users_search_name" ON "users" USING GIN ("display_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_users_subscription" ON "users"("subscription_plan", "subscription_status");

-- CreateIndex
CREATE INDEX "idx_vibe_bookmarks_user" ON "vibe_bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "idx_vibe_likes_user" ON "vibe_likes"("user_id");

-- CreateIndex
CREATE INDEX "idx_vibe_likes_vibe" ON "vibe_likes"("vibe_id");

-- CreateIndex
CREATE UNIQUE INDEX "vibe_polls_vibe_id_key" ON "vibe_polls"("vibe_id");

-- CreateIndex
CREATE INDEX "idx_vibe_reposts_vibe" ON "vibe_reposts"("vibe_id");

-- CreateIndex
CREATE INDEX "idx_vibe_views_vibe" ON "vibe_views"("vibe_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_vibe_views_viewer" ON "vibe_views"("viewer_id") WHERE (viewer_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_vibes_autopilot" ON "vibes"("is_autopilot", "created_at" DESC) WHERE (is_autopilot = true);

-- CreateIndex
CREATE INDEX "idx_vibes_category" ON "vibes"("category", "created_at" DESC) WHERE (is_deleted = false);

-- CreateIndex
CREATE INDEX "idx_vibes_created" ON "vibes"("created_at" DESC) WHERE (is_deleted = false);

-- CreateIndex
CREATE INDEX "idx_vibes_feed_cat" ON "vibes"("category", "created_at" DESC, "likes_count" DESC) WHERE (is_deleted = false);

-- CreateIndex
CREATE INDEX "idx_vibes_reply_to" ON "vibes"("reply_to") WHERE (reply_to IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_vibes_scheduled" ON "vibes"("scheduled_at") WHERE ((scheduled_at IS NOT NULL) AND (is_deleted = false));

-- CreateIndex
CREATE INDEX "idx_vibes_tags" ON "vibes" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_vibes_thread_root" ON "vibes"("thread_root_id") WHERE (thread_root_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_vibes_trending" ON "vibes"("likes_count" DESC, "reposts_count" DESC, "created_at" DESC) WHERE (is_deleted = false);

-- CreateIndex
CREATE INDEX "idx_vibes_user" ON "vibes"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_config" ADD CONSTRAINT "app_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_comments" ADD CONSTRAINT "autopilot_comments_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "autopilot_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_comments" ADD CONSTRAINT "autopilot_comments_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_configs" ADD CONSTRAINT "autopilot_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_runs" ADD CONSTRAINT "autopilot_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_schedules" ADD CONSTRAINT "autopilot_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_topics" ADD CONSTRAINT "autopilot_topics_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "autopilot_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "autopilot_topics" ADD CONSTRAINT "autopilot_topics_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkpoint_responses" ADD CONSTRAINT "checkpoint_responses_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "knowledge_checkpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkpoint_responses" ADD CONSTRAINT "checkpoint_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "close_connections" ADD CONSTRAINT "close_connections_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "close_connections" ADD CONSTRAINT "close_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_moderators" ADD CONSTRAINT "community_moderators_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_moderators" ADD CONSTRAINT "community_moderators_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_moderators" ADD CONSTRAINT "community_moderators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrolments" ADD CONSTRAINT "course_enrolments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_ratings" ADD CONSTRAINT "course_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_educator_id_fkey" FOREIGN KEY ("educator_id") REFERENCES "educator_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_analytics_daily" ADD CONSTRAINT "creator_analytics_daily_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_subscription_tiers" ADD CONSTRAINT "creator_subscription_tiers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "creator_subscription_tiers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "digital_product_purchases" ADD CONSTRAINT "digital_product_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "digital_product_purchases" ADD CONSTRAINT "digital_product_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "digital_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "digital_products" ADD CONSTRAINT "digital_products_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_categories" ADD CONSTRAINT "forum_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "forum_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "thread_replies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_checkpoints" ADD CONSTRAINT "knowledge_checkpoints_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_streaks" ADD CONSTRAINT "learning_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_space_id_fkey" FOREIGN KEY ("shared_space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_vibe_id_fkey" FOREIGN KEY ("shared_vibe_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_vibe_id_fkey" FOREIGN KEY ("target_vibe_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paid_dm_access" ADD CONSTRAINT "paid_dm_access_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paid_dm_access" ADD CONSTRAINT "paid_dm_access_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_courses" ADD CONSTRAINT "path_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_courses" ADD CONSTRAINT "path_courses_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_enrolments" ADD CONSTRAINT "path_enrolments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "path_enrolments" ADD CONSTRAINT "path_enrolments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_message_id_fkey" FOREIGN KEY ("reported_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_space_id_fkey" FOREIGN KEY ("reported_space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_vibe_id_fkey" FOREIGN KEY ("reported_vibe_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_cohosts" ADD CONSTRAINT "space_cohosts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_cohosts" ADD CONSTRAINT "space_cohosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_participant_history" ADD CONSTRAINT "space_participant_history_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_participant_history" ADD CONSTRAINT "space_participant_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_participants" ADD CONSTRAINT "space_participants_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_participants" ADD CONSTRAINT "space_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_reminders" ADD CONSTRAINT "space_reminders_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_reminders" ADD CONSTRAINT "space_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_speaker_requests" ADD CONSTRAINT "space_speaker_requests_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_speaker_requests" ADD CONSTRAINT "space_speaker_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_tickets" ADD CONSTRAINT "space_tickets_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_tickets" ADD CONSTRAINT "space_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_tips" ADD CONSTRAINT "space_tips_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_tips" ADD CONSTRAINT "space_tips_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "space_tips" ADD CONSTRAINT "space_tips_tipper_id_fkey" FOREIGN KEY ("tipper_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stickers" ADD CONSTRAINT "stickers_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "sticker_packs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "super_vibes" ADD CONSTRAINT "super_vibes_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "super_vibes" ADD CONSTRAINT "super_vibes_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "super_vibes" ADD CONSTRAINT "super_vibes_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "super_vibes" ADD CONSTRAINT "super_vibes_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "thread_replies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thread_replies" ADD CONSTRAINT "thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thread_tags" ADD CONSTRAINT "thread_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "forum_tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "thread_tags" ADD CONSTRAINT "thread_tags_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "translation_usage" ADD CONSTRAINT "translation_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trust_signals" ADD CONSTRAINT "trust_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_feature_flags" ADD CONSTRAINT "user_feature_flags_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_feature_flags" ADD CONSTRAINT "user_feature_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_permissions" ADD CONSTRAINT "user_has_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_permissions" ADD CONSTRAINT "user_has_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_permissions" ADD CONSTRAINT "user_has_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_roles" ADD CONSTRAINT "user_has_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_roles" ADD CONSTRAINT "user_has_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_has_roles" ADD CONSTRAINT "user_has_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muted_id_fkey" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muter_id_fkey" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_topic_memberships" ADD CONSTRAINT "user_topic_memberships_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "explore_topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_topic_memberships" ADD CONSTRAINT "user_topic_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_bookmarks" ADD CONSTRAINT "vibe_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_bookmarks" ADD CONSTRAINT "vibe_bookmarks_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_event_reminders" ADD CONSTRAINT "vibe_event_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_event_reminders" ADD CONSTRAINT "vibe_event_reminders_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_likes" ADD CONSTRAINT "vibe_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_likes" ADD CONSTRAINT "vibe_likes_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_media" ADD CONSTRAINT "vibe_media_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_poll_options" ADD CONSTRAINT "vibe_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "vibe_polls"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_poll_votes" ADD CONSTRAINT "vibe_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "vibe_poll_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_poll_votes" ADD CONSTRAINT "vibe_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "vibe_polls"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_poll_votes" ADD CONSTRAINT "vibe_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_polls" ADD CONSTRAINT "vibe_polls_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_reposts" ADD CONSTRAINT "vibe_reposts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_reposts" ADD CONSTRAINT "vibe_reposts_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_translations" ADD CONSTRAINT "vibe_translations_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_views" ADD CONSTRAINT "vibe_views_vibe_id_fkey" FOREIGN KEY ("vibe_id") REFERENCES "vibes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibe_views" ADD CONSTRAINT "vibe_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "fk_vibes_event_space" FOREIGN KEY ("event_space_id") REFERENCES "vibes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_quote_of_fkey" FOREIGN KEY ("quote_of") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_repost_of_fkey" FOREIGN KEY ("repost_of") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_thread_root_id_fkey" FOREIGN KEY ("thread_root_id") REFERENCES "vibes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vibes" ADD CONSTRAINT "vibes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

