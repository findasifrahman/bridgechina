-- CreateTable
CREATE TABLE "homepage_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "link" TEXT,
    "cta_text" TEXT DEFAULT 'Learn More',
    "cover_asset_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homepage_banners_is_active_sort_order_idx" ON "homepage_banners"("is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "homepage_banners" ADD CONSTRAINT "homepage_banners_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
