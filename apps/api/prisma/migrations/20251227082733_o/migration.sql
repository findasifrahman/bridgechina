-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_places" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "geo_lat" DOUBLE PRECISION,
    "geo_lng" DOUBLE PRECISION,
    "star_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "cost_range" TEXT,
    "opening_hours" JSONB,
    "customer_support_phone" TEXT,
    "is_family_friendly" BOOLEAN NOT NULL DEFAULT false,
    "is_pet_friendly" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_place_images" (
    "id" TEXT NOT NULL,
    "city_place_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_place_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_city_places" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "city_place_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_highlight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_city_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_entity_type_entity_id_idx" ON "reviews"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "city_places_slug_key" ON "city_places"("slug");

-- CreateIndex
CREATE INDEX "city_places_city_id_idx" ON "city_places"("city_id");

-- CreateIndex
CREATE INDEX "city_places_slug_idx" ON "city_places"("slug");

-- CreateIndex
CREATE INDEX "city_places_is_active_idx" ON "city_places"("is_active");

-- CreateIndex
CREATE INDEX "city_places_star_rating_idx" ON "city_places"("star_rating");

-- CreateIndex
CREATE INDEX "city_place_images_city_place_id_idx" ON "city_place_images"("city_place_id");

-- CreateIndex
CREATE INDEX "city_place_images_is_primary_idx" ON "city_place_images"("is_primary");

-- CreateIndex
CREATE INDEX "tour_city_places_tour_id_idx" ON "tour_city_places"("tour_id");

-- CreateIndex
CREATE INDEX "tour_city_places_city_place_id_idx" ON "tour_city_places"("city_place_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_city_places_tour_id_city_place_id_key" ON "tour_city_places"("tour_id", "city_place_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_places" ADD CONSTRAINT "city_places_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_place_images" ADD CONSTRAINT "city_place_images_city_place_id_fkey" FOREIGN KEY ("city_place_id") REFERENCES "city_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_place_images" ADD CONSTRAINT "city_place_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_city_places" ADD CONSTRAINT "tour_city_places_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_city_places" ADD CONSTRAINT "tour_city_places_city_place_id_fkey" FOREIGN KEY ("city_place_id") REFERENCES "city_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
