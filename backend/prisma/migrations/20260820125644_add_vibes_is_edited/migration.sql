-- V-18: visible "edited" marker on vibes
ALTER TABLE "vibes" ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT false;
