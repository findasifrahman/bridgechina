-- CreateTable
CREATE TABLE "service_based_offers" (
    "id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "offer_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT DEFAULT 'CNY',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "terms_and_conditions" TEXT,
    "cover_asset_id" TEXT,
    "gallery_asset_ids" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "min_purchase_amount" DOUBLE PRECISION,
    "max_discount_amount" DOUBLE PRECISION,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_based_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_based_offers_service_type_key" ON "service_based_offers"("service_type");

-- CreateIndex
CREATE INDEX "service_based_offers_service_type_idx" ON "service_based_offers"("service_type");

-- CreateIndex
CREATE INDEX "service_based_offers_is_active_idx" ON "service_based_offers"("is_active");

-- CreateIndex
CREATE INDEX "service_based_offers_valid_from_valid_until_idx" ON "service_based_offers"("valid_from", "valid_until");

-- AddForeignKey
ALTER TABLE "service_based_offers" ADD CONSTRAINT "service_based_offers_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
