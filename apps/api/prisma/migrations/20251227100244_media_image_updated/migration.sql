-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "category" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnail_key" TEXT,
ADD COLUMN     "thumbnail_url" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE INDEX "media_assets_category_idx" ON "media_assets"("category");

-- CreateIndex
CREATE INDEX "media_assets_tags_idx" ON "media_assets"("tags");
