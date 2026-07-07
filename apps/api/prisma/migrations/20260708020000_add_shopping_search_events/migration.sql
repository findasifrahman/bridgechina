CREATE TABLE IF NOT EXISTS "shopping_search_events" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "intent_type" TEXT NOT NULL,
  "query_text" TEXT NOT NULL,
  "normalized_key" TEXT NOT NULL,
  "category_slug" TEXT,
  "language" TEXT NOT NULL DEFAULT 'zh',
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shopping_search_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shopping_search_events_source_created_at_idx"
  ON "shopping_search_events"("source", "created_at");

CREATE INDEX IF NOT EXISTS "shopping_search_events_normalized_key_idx"
  ON "shopping_search_events"("normalized_key");

CREATE INDEX IF NOT EXISTS "shopping_search_events_intent_type_idx"
  ON "shopping_search_events"("intent_type");

CREATE INDEX IF NOT EXISTS "shopping_search_events_category_slug_idx"
  ON "shopping_search_events"("category_slug");
