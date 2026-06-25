CREATE TABLE IF NOT EXISTS "auth_email_otps" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_email_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_email_otps_email_purpose_idx" ON "auth_email_otps"("email", "purpose");
CREATE INDEX IF NOT EXISTS "auth_email_otps_expires_at_idx" ON "auth_email_otps"("expires_at");
