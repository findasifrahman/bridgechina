ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "purchase_order_no" TEXT,
  ADD COLUMN IF NOT EXISTS "tracking_no" TEXT;
