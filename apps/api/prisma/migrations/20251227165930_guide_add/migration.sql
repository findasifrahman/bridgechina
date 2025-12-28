/*
  Warnings:

  - You are about to drop the column `images` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `medical_centers` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `tours` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `transport_products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "images";

-- AlterTable
ALTER TABLE "medical_centers" DROP COLUMN "images";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "images";

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "images";

-- AlterTable
ALTER TABLE "tours" DROP COLUMN "images";

-- AlterTable
ALTER TABLE "transport_products" DROP COLUMN "images";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
