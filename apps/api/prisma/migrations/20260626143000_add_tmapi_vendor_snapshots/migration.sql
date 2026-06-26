ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "product_url" TEXT,
  ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
  ADD COLUMN IF NOT EXISTS "vendor_name" TEXT,
  ADD COLUMN IF NOT EXISTS "shop_url" TEXT;

ALTER TABLE "cart_items"
  ADD COLUMN IF NOT EXISTS "product_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "seller_name_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "vendor_id_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "shop_url_snapshot" TEXT;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "product_url_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "seller_name_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "vendor_id_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "shop_url_snapshot" TEXT;

UPDATE "products"
SET "product_url" = COALESCE("product_url", "source_url")
WHERE "product_url" IS NULL AND "source_url" IS NOT NULL;

UPDATE "cart_items"
SET "product_url_snapshot" = COALESCE("product_url_snapshot", "source_url_snapshot")
WHERE "product_url_snapshot" IS NULL AND "source_url_snapshot" IS NOT NULL;

UPDATE "order_items"
SET "product_url_snapshot" = COALESCE("product_url_snapshot", "source_url_snapshot")
WHERE "product_url_snapshot" IS NULL AND "source_url_snapshot" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "products_vendor_id_idx" ON "products"("vendor_id");
CREATE INDEX IF NOT EXISTS "cart_items_vendor_id_snapshot_idx" ON "cart_items"("vendor_id_snapshot");
CREATE INDEX IF NOT EXISTS "order_items_vendor_id_snapshot_idx" ON "order_items"("vendor_id_snapshot");
