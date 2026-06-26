CREATE TABLE IF NOT EXISTS "auth_phone_otps" (
  "id" TEXT PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "auth_phone_otps_phone_purpose_idx" ON "auth_phone_otps" ("phone", "purpose");
CREATE INDEX IF NOT EXISTS "auth_phone_otps_expires_at_idx" ON "auth_phone_otps" ("expires_at");

CREATE TABLE IF NOT EXISTS "auth_otp_blocks" (
  "id" TEXT PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "reason" TEXT,
  "blocked_until" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "auth_otp_blocks_channel_identifier_idx" ON "auth_otp_blocks" ("channel", "identifier");
CREATE INDEX IF NOT EXISTS "auth_otp_blocks_blocked_until_idx" ON "auth_otp_blocks" ("blocked_until");
