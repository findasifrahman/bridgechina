-- CreateTable
CREATE TABLE "external_catalog_items" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT,
    "price_min" DOUBLE PRECISION,
    "price_max" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "main_images" JSONB,
    "skus_json" JSONB,
    "seller_json" JSONB,
    "source_url" TEXT,
    "raw_json" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_search_cache" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "query_json" JSONB,
    "results_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_hot_items" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category_slug" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "pinned_rank" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_hot_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_items_external_id_key" ON "external_catalog_items"("external_id");

-- CreateIndex
CREATE INDEX "external_catalog_items_source_idx" ON "external_catalog_items"("source");

-- CreateIndex
CREATE INDEX "external_catalog_items_expires_at_idx" ON "external_catalog_items"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_search_cache_cache_key_key" ON "external_search_cache"("cache_key");

-- CreateIndex
CREATE INDEX "external_search_cache_source_idx" ON "external_search_cache"("source");

-- CreateIndex
CREATE INDEX "external_search_cache_expires_at_idx" ON "external_search_cache"("expires_at");

-- CreateIndex
CREATE INDEX "external_hot_items_category_slug_idx" ON "external_hot_items"("category_slug");

-- CreateIndex
CREATE INDEX "external_hot_items_external_id_idx" ON "external_hot_items"("external_id");
