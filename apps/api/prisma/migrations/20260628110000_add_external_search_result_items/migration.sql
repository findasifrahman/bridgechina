CREATE TABLE IF NOT EXISTS "external_search_result_items" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "search_kind" TEXT NOT NULL,
  "search_key" TEXT NOT NULL,
  "search_phrase" TEXT,
  "page" INTEGER NOT NULL DEFAULT 1,
  "external_id" TEXT NOT NULL,
  "title_original" TEXT,
  "title_en" TEXT,
  "item_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_search_result_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "external_search_result_items_source_search_key_external_id_key"
  ON "external_search_result_items"("source", "search_key", "external_id");

CREATE INDEX IF NOT EXISTS "external_search_result_items_source_external_id_idx"
  ON "external_search_result_items"("source", "external_id");

CREATE INDEX IF NOT EXISTS "external_search_result_items_search_key_idx"
  ON "external_search_result_items"("search_key");

CREATE INDEX IF NOT EXISTS "external_search_result_items_expires_at_idx"
  ON "external_search_result_items"("expires_at");
