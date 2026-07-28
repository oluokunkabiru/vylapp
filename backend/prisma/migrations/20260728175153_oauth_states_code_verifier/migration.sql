-- PKCE support for providers that require it (Twitter/X).
ALTER TABLE "oauth_states" ADD COLUMN IF NOT EXISTS "code_verifier" TEXT;
