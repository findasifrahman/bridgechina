/*
  Warnings:

  - You are about to drop the column `updated_at` on the `external_catalog_items` table. All the data in the column will be lost.
  - You are about to drop the `city_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `city_place_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `esim_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hotel_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `medical_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `restaurant_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tour_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transport_images` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[source,external_id]` on the table `external_hot_items` will be added. If there are existing duplicate values, this will fail.
  - Made the column `query_json` on table `external_search_cache` required. This step will fail if there are existing NULL values in that column.
  - Made the column `results_json` on table `external_search_cache` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "HotelSource" AS ENUM ('INTERNAL', 'BOOKINGCOM');

-- DropForeignKey
ALTER TABLE "city_images" DROP CONSTRAINT "city_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "city_images" DROP CONSTRAINT "city_images_city_id_fkey";

-- DropForeignKey
ALTER TABLE "city_place_images" DROP CONSTRAINT "city_place_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "city_place_images" DROP CONSTRAINT "city_place_images_city_place_id_fkey";

-- DropForeignKey
ALTER TABLE "esim_images" DROP CONSTRAINT "esim_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "esim_images" DROP CONSTRAINT "esim_images_esim_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "hotel_images" DROP CONSTRAINT "hotel_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "hotel_images" DROP CONSTRAINT "hotel_images_hotel_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_images" DROP CONSTRAINT "medical_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "medical_images" DROP CONSTRAINT "medical_images_medical_center_id_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_images" DROP CONSTRAINT "restaurant_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "restaurant_images" DROP CONSTRAINT "restaurant_images_restaurant_id_fkey";

-- DropForeignKey
ALTER TABLE "tour_images" DROP CONSTRAINT "tour_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "tour_images" DROP CONSTRAINT "tour_images_tour_id_fkey";

-- DropForeignKey
ALTER TABLE "transport_images" DROP CONSTRAINT "transport_images_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "transport_images" DROP CONSTRAINT "transport_images_transport_product_id_fkey";

-- DropIndex
DROP INDEX "external_hot_items_category_slug_idx";

-- DropIndex
DROP INDEX "external_hot_items_external_id_idx";

-- DropIndex
DROP INDEX "external_search_cache_source_idx";

-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "city_places" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "esim_plans" ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "external_catalog_items" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "external_search_cache" ALTER COLUMN "query_json" SET NOT NULL,
ALTER COLUMN "results_json" SET NOT NULL;

-- AlterTable
ALTER TABLE "hotel_bookings" ADD COLUMN     "adults" INTEGER DEFAULT 1,
ADD COLUMN     "children_age" TEXT,
ADD COLUMN     "external_hotel_id" TEXT,
ADD COLUMN     "hotel_source" "HotelSource" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "room_qty" INTEGER DEFAULT 1,
ALTER COLUMN "checkin" DROP NOT NULL,
ALTER COLUMN "checkout" DROP NOT NULL,
ALTER COLUMN "guests" DROP NOT NULL,
ALTER COLUMN "rooms" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "medical_centers" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- AlterTable
ALTER TABLE "transport_products" ADD COLUMN     "cover_asset_id" TEXT,
ADD COLUMN     "gallery_asset_ids" JSONB;

-- DropTable
DROP TABLE "city_images";

-- DropTable
DROP TABLE "city_place_images";

-- DropTable
DROP TABLE "esim_images";

-- DropTable
DROP TABLE "hotel_images";

-- DropTable
DROP TABLE "medical_images";

-- DropTable
DROP TABLE "product_images";

-- DropTable
DROP TABLE "restaurant_images";

-- DropTable
DROP TABLE "tour_images";

-- DropTable
DROP TABLE "transport_images";

-- CreateTable
CREATE TABLE "external_hotel_providers" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_hotel_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_destinations" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "dest_id" TEXT NOT NULL,
    "dest_type" TEXT NOT NULL,
    "search_type" TEXT NOT NULL,
    "label" TEXT,
    "city_name" TEXT,
    "country" TEXT,
    "cc1" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nr_hotels" INTEGER,
    "image_url" TEXT,
    "roundtrip" TEXT,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_hotels" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "ufi" INTEGER,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "country_code" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "star_rating" INTEGER,
    "review_score" DOUBLE PRECISION,
    "review_score_word" TEXT,
    "review_count" INTEGER,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT DEFAULT 'CNY',
    "gross_price" DOUBLE PRECISION,
    "strikethrough_price" DOUBLE PRECISION,
    "has_free_cancellation" BOOLEAN,
    "includes_taxes_and_charges" BOOLEAN,
    "cover_photo_url" TEXT,
    "photo_urls" JSONB,
    "gallery_photos" JSONB,
    "highlights" JSONB,
    "facilities" JSONB,
    "languages_spoken" JSONB,
    "payment_features" JSONB,
    "description" JSONB,
    "review_filters" JSONB,
    "review_scores" JSONB,
    "attractions" JSONB,
    "booking_url" TEXT,
    "raw_details_json" JSONB,
    "raw_search_json" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_hotel_search_cache" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dest_id" TEXT NOT NULL,
    "search_type" TEXT NOT NULL,
    "checkin" TEXT,
    "checkout" TEXT,
    "adults" INTEGER,
    "room_qty" INTEGER,
    "page_number" INTEGER,
    "currency_code" TEXT DEFAULT 'CNY',
    "languagecode" TEXT DEFAULT 'en-us',
    "hotel_ids" JSONB NOT NULL,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_hotel_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "city_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "languages" JSONB NOT NULL,
    "hourly_rate" DOUBLE PRECISION,
    "daily_rate" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "cover_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_requests" (
    "request_id" TEXT NOT NULL,
    "service_mode" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "meeting_point" TEXT,
    "places" JSONB,
    "notes" TEXT,
    "people_count" INTEGER,
    "budget_min" DOUBLE PRECISION,
    "budget_max" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "guide_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "guide_offers" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "guide_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_hotel_providers_provider_key" ON "external_hotel_providers"("provider");

-- CreateIndex
CREATE INDEX "external_destinations_provider_query_idx" ON "external_destinations"("provider", "query");

-- CreateIndex
CREATE UNIQUE INDEX "external_destinations_provider_dest_id_dest_type_key" ON "external_destinations"("provider", "dest_id", "dest_type");

-- CreateIndex
CREATE INDEX "external_hotels_provider_city_idx" ON "external_hotels"("provider", "city");

-- CreateIndex
CREATE INDEX "external_hotels_last_synced_at_idx" ON "external_hotels"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_hotels_provider_hotel_id_key" ON "external_hotels"("provider", "hotel_id");

-- CreateIndex
CREATE INDEX "external_hotel_search_cache_provider_dest_id_idx" ON "external_hotel_search_cache"("provider", "dest_id");

-- CreateIndex
CREATE INDEX "external_hotel_search_cache_created_at_idx" ON "external_hotel_search_cache"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guide_profiles_user_id_key" ON "guide_profiles"("user_id");

-- CreateIndex
CREATE INDEX "guide_profiles_city_id_idx" ON "guide_profiles"("city_id");

-- CreateIndex
CREATE INDEX "guide_profiles_verified_idx" ON "guide_profiles"("verified");

-- CreateIndex
CREATE INDEX "guide_profiles_rating_idx" ON "guide_profiles"("rating");

-- CreateIndex
CREATE INDEX "guide_profiles_user_id_idx" ON "guide_profiles"("user_id");

-- CreateIndex
CREATE INDEX "guide_offers_request_id_idx" ON "guide_offers"("request_id");

-- CreateIndex
CREATE INDEX "guide_offers_guide_id_idx" ON "guide_offers"("guide_id");

-- CreateIndex
CREATE INDEX "external_hot_items_pinned_rank_idx" ON "external_hot_items"("pinned_rank");

-- CreateIndex
CREATE UNIQUE INDEX "external_hot_items_source_external_id_key" ON "external_hot_items"("source", "external_id");

-- CreateIndex
CREATE INDEX "external_search_cache_source_cache_key_idx" ON "external_search_cache"("source", "cache_key");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_centers" ADD CONSTRAINT "medical_centers_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_products" ADD CONSTRAINT "transport_products_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_places" ADD CONSTRAINT "city_places_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_requests" ADD CONSTRAINT "guide_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_offers" ADD CONSTRAINT "guide_offers_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_offers" ADD CONSTRAINT "guide_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "guide_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;
