/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "description" TEXT,
ADD COLUMN     "highlights" JSONB;

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "amenities" JSONB,
ADD COLUMN     "checkin_time" TEXT,
ADD COLUMN     "checkout_time" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "facilities" JSONB,
ADD COLUMN     "price_to" DOUBLE PRECISION,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "star_rating" INTEGER,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "medical_centers" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "emergency_available" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "services" JSONB,
ADD COLUMN     "specialties" JSONB,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "original_price" DOUBLE PRECISION,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "weight_kg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "amenities" JSONB,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "cuisine_type" TEXT,
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "price_range" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialties" JSONB,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "cancellation_policy" TEXT,
ADD COLUMN     "duration_hours" INTEGER,
ADD COLUMN     "exclusions" JSONB,
ADD COLUMN     "highlights" JSONB,
ADD COLUMN     "inclusions" JSONB,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "max_group_size" INTEGER,
ADD COLUMN     "min_group_size" INTEGER,
ADD COLUMN     "price_to" DOUBLE PRECISION,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transport_products" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "images" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "price_per_km" DOUBLE PRECISION,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vehicle_type" TEXT;

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_blocks" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "payload" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "city_id" TEXT,
    "title" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "tags" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esim_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "package_code" TEXT,
    "provider" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'China',
    "region_text" TEXT NOT NULL,
    "package_type" TEXT NOT NULL DEFAULT 'single_country',
    "data_text" TEXT NOT NULL,
    "data_amount_gb" DOUBLE PRECISION,
    "data_period" TEXT,
    "validity_days" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "data_speed" TEXT,
    "supported_operators" JSONB,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "number_available" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "cover_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esim_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_images" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_images" (
    "id" TEXT NOT NULL,
    "medical_center_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_images" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_images" (
    "id" TEXT NOT NULL,
    "transport_product_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_images" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esim_images" (
    "id" TEXT NOT NULL,
    "esim_plan_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esim_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- CreateIndex
CREATE INDEX "homepage_blocks_type_is_active_idx" ON "homepage_blocks"("type", "is_active");

-- CreateIndex
CREATE INDEX "homepage_blocks_sort_order_idx" ON "homepage_blocks"("sort_order");

-- CreateIndex
CREATE INDEX "gallery_images_city_id_idx" ON "gallery_images"("city_id");

-- CreateIndex
CREATE INDEX "gallery_images_is_active_idx" ON "gallery_images"("is_active");

-- CreateIndex
CREATE INDEX "gallery_images_sort_order_idx" ON "gallery_images"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "esim_plans_package_code_key" ON "esim_plans"("package_code");

-- CreateIndex
CREATE INDEX "esim_plans_is_active_idx" ON "esim_plans"("is_active");

-- CreateIndex
CREATE INDEX "esim_plans_provider_idx" ON "esim_plans"("provider");

-- CreateIndex
CREATE INDEX "esim_plans_country_idx" ON "esim_plans"("country");

-- CreateIndex
CREATE INDEX "esim_plans_package_type_idx" ON "esim_plans"("package_type");

-- CreateIndex
CREATE INDEX "hotel_images_hotel_id_idx" ON "hotel_images"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_images_is_primary_idx" ON "hotel_images"("is_primary");

-- CreateIndex
CREATE INDEX "restaurant_images_restaurant_id_idx" ON "restaurant_images"("restaurant_id");

-- CreateIndex
CREATE INDEX "restaurant_images_is_primary_idx" ON "restaurant_images"("is_primary");

-- CreateIndex
CREATE INDEX "medical_images_medical_center_id_idx" ON "medical_images"("medical_center_id");

-- CreateIndex
CREATE INDEX "medical_images_is_primary_idx" ON "medical_images"("is_primary");

-- CreateIndex
CREATE INDEX "tour_images_tour_id_idx" ON "tour_images"("tour_id");

-- CreateIndex
CREATE INDEX "tour_images_is_primary_idx" ON "tour_images"("is_primary");

-- CreateIndex
CREATE INDEX "transport_images_transport_product_id_idx" ON "transport_images"("transport_product_id");

-- CreateIndex
CREATE INDEX "transport_images_is_primary_idx" ON "transport_images"("is_primary");

-- CreateIndex
CREATE INDEX "city_images_city_id_idx" ON "city_images"("city_id");

-- CreateIndex
CREATE INDEX "city_images_is_primary_idx" ON "city_images"("is_primary");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_images_is_primary_idx" ON "product_images"("is_primary");

-- CreateIndex
CREATE INDEX "esim_images_esim_plan_id_idx" ON "esim_images"("esim_plan_id");

-- CreateIndex
CREATE INDEX "esim_images_is_primary_idx" ON "esim_images"("is_primary");

-- CreateIndex
CREATE INDEX "hotels_verified_idx" ON "hotels"("verified");

-- CreateIndex
CREATE INDEX "hotels_rating_idx" ON "hotels"("rating");

-- CreateIndex
CREATE INDEX "medical_centers_verified_idx" ON "medical_centers"("verified");

-- CreateIndex
CREATE INDEX "medical_centers_rating_idx" ON "medical_centers"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_rating_idx" ON "products"("rating");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "restaurants_rating_idx" ON "restaurants"("rating");

-- CreateIndex
CREATE INDEX "tours_rating_idx" ON "tours"("rating");

-- CreateIndex
CREATE INDEX "transport_products_type_idx" ON "transport_products"("type");

-- CreateIndex
CREATE INDEX "transport_products_rating_idx" ON "transport_products"("rating");

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esim_plans" ADD CONSTRAINT "esim_plans_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_images" ADD CONSTRAINT "restaurant_images_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_images" ADD CONSTRAINT "restaurant_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_medical_center_id_fkey" FOREIGN KEY ("medical_center_id") REFERENCES "medical_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_images" ADD CONSTRAINT "transport_images_transport_product_id_fkey" FOREIGN KEY ("transport_product_id") REFERENCES "transport_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_images" ADD CONSTRAINT "transport_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_images" ADD CONSTRAINT "city_images_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_images" ADD CONSTRAINT "city_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esim_images" ADD CONSTRAINT "esim_images_esim_plan_id_fkey" FOREIGN KEY ("esim_plan_id") REFERENCES "esim_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esim_images" ADD CONSTRAINT "esim_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
