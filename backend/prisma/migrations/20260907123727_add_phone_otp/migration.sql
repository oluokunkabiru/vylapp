-- I-02: phone + one-time-code sign-in.
-- `phone` is nullable/unique — existing accounts are untouched (no phone on
-- record yet). `phone_otps` is a short-lived table: one live row per phone
-- number at a time (a new request-otp call consumes the previous row before
-- inserting a new one — see auth.controller.ts's requestPhoneOtp).
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMPTZ;
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "phone_otps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "user_id" UUID,

    CONSTRAINT "phone_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_otps_phone_idx" ON "phone_otps"("phone");

ALTER TABLE "phone_otps" ADD CONSTRAINT "phone_otps_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
