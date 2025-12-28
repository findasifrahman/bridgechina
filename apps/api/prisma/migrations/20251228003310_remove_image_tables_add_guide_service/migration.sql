-- Remove Image Tables
DROP TABLE IF EXISTS "city_place_images" CASCADE;
DROP TABLE IF EXISTS "city_images" CASCADE;
DROP TABLE IF EXISTS "transport_images" CASCADE;
DROP TABLE IF EXISTS "tour_images" CASCADE;
DROP TABLE IF EXISTS "medical_images" CASCADE;
DROP TABLE IF EXISTS "restaurant_images" CASCADE;
DROP TABLE IF EXISTS "hotel_images" CASCADE;
DROP TABLE IF EXISTS "product_images" CASCADE;
DROP TABLE IF EXISTS "esim_images" CASCADE;

-- Add new image columns to entities
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "medical_centers" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "medical_centers" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "tours" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "tours" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "transport_products" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "transport_products" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "esim_plans" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

ALTER TABLE "city_places" ADD COLUMN IF NOT EXISTS "cover_asset_id" TEXT;
ALTER TABLE "city_places" ADD COLUMN IF NOT EXISTS "gallery_asset_ids" JSONB;

-- Add foreign key constraints for cover images
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medical_centers" ADD CONSTRAINT "medical_centers_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transport_products" ADD CONSTRAINT "transport_products_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cities" ADD CONSTRAINT "cities_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "city_places" ADD CONSTRAINT "city_places_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Guide Service Tables
CREATE TABLE "guide_profiles" (
    "user_id" TEXT NOT NULL,
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

    CONSTRAINT "guide_profiles_pkey" PRIMARY KEY ("user_id")
);

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

-- Add indexes
CREATE INDEX "guide_profiles_city_id_idx" ON "guide_profiles"("city_id");
CREATE INDEX "guide_profiles_verified_idx" ON "guide_profiles"("verified");
CREATE INDEX "guide_profiles_rating_idx" ON "guide_profiles"("rating");
CREATE INDEX "guide_offers_request_id_idx" ON "guide_offers"("request_id");
CREATE INDEX "guide_offers_guide_id_idx" ON "guide_offers"("guide_id");

-- Add foreign keys
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guide_requests" ADD CONSTRAINT "guide_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guide_offers" ADD CONSTRAINT "guide_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "guide_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guide_offers" ADD CONSTRAINT "guide_offers_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add 'guide' service category if not exists
INSERT INTO "service_categories" ("id", "key", "name")
SELECT gen_random_uuid()::TEXT, 'guide', 'Guide Service'
WHERE NOT EXISTS (SELECT 1 FROM "service_categories" WHERE "key" = 'guide');

-- Add GUIDE role if not exists
INSERT INTO "roles" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::TEXT, 'GUIDE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'GUIDE');

