-- C-13: message requests inbox — per-membership-row status, "active" or "requested"
ALTER TABLE "conversation_members" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
