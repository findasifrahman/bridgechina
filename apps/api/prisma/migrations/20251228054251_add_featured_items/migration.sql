-- CreateTable
CREATE TABLE "featured_items" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "title_override" TEXT,
    "subtitle_override" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "featured_items_entity_type_idx" ON "featured_items"("entity_type");

-- CreateIndex
CREATE INDEX "featured_items_is_active_idx" ON "featured_items"("is_active");

-- CreateIndex
CREATE INDEX "featured_items_sort_order_idx" ON "featured_items"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "featured_items_entity_type_entity_id_key" ON "featured_items"("entity_type", "entity_id");
