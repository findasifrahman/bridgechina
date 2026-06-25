-- Add coupon policy tables and order discount snapshot fields.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "coupon_code" TEXT,
  ADD COLUMN IF NOT EXISTS "coupon_id" TEXT;

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "discount_type" TEXT NOT NULL,
  "discount_value" DOUBLE PRECISION NOT NULL,
  "max_discount_amount" DOUBLE PRECISION,
  "min_order_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "usage_limit" INTEGER,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "per_user_limit" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
  "id" TEXT NOT NULL,
  "coupon_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "coupon_code" TEXT NOT NULL,
  "discount_amount" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_is_active_idx" ON "coupons"("is_active");
CREATE INDEX IF NOT EXISTS "coupons_starts_at_idx" ON "coupons"("starts_at");
CREATE INDEX IF NOT EXISTS "coupons_ends_at_idx" ON "coupons"("ends_at");
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_id_idx" ON "coupon_redemptions"("coupon_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_user_id_idx" ON "coupon_redemptions"("user_id");
CREATE INDEX IF NOT EXISTS "coupon_redemptions_coupon_code_idx" ON "coupon_redemptions"("coupon_code");
CREATE INDEX IF NOT EXISTS "orders_coupon_code_idx" ON "orders"("coupon_code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'coupon_redemptions_coupon_id_fkey'
      AND table_name = 'coupon_redemptions'
  ) THEN
    ALTER TABLE "coupon_redemptions"
      ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey"
      FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'coupon_redemptions_order_id_fkey'
      AND table_name = 'coupon_redemptions'
  ) THEN
    ALTER TABLE "coupon_redemptions"
      ADD CONSTRAINT "coupon_redemptions_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
