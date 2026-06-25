-- Add snapshot fields used by checkout/cart sync.
-- Idempotent because some environments may already have received these via prisma db push.
ALTER TABLE "cart_items"
  ADD COLUMN IF NOT EXISTS "sku_details_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "image_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "selected_shipping_method" TEXT,
  ADD COLUMN IF NOT EXISTS "estimated_weight_kg" DOUBLE PRECISION;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "sku_details_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "image_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "selected_shipping_method" TEXT,
  ADD COLUMN IF NOT EXISTS "estimated_weight_kg" DOUBLE PRECISION;
