-- Changing a password revokes sessions signed in before it (lib/auth.ts)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
