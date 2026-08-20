-- I-14/I-15: permanent minor flag, fail-closed default.
-- New rows default to TRUE (treated as minor until a real birthday is on
-- record). Existing rows predate this column entirely and have no birthday
-- backing a "minor" claim, so they're backfilled to FALSE rather than
-- retroactively restricted with no evidence.
ALTER TABLE "users" ADD COLUMN "is_minor" BOOLEAN NOT NULL DEFAULT true;
UPDATE "users" SET "is_minor" = false WHERE "birthday" IS NULL;
