/*
  Warnings:

  - A unique constraint covering the columns `[source,external_id]` on the table `external_catalog_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `external_catalog_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "external_catalog_items_external_id_key";

-- AlterTable
ALTER TABLE "external_catalog_items" ADD COLUMN     "title_en" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_items_source_external_id_key" ON "external_catalog_items"("source", "external_id");
