CREATE TABLE IF NOT EXISTS "shopping_search_intents" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "intent_type" TEXT NOT NULL,
  "query_text" TEXT NOT NULL,
  "normalized_key" TEXT NOT NULL,
  "category_slug" TEXT,
  "language" TEXT NOT NULL DEFAULT 'zh',
  "search_count" INTEGER NOT NULL DEFAULT 1,
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "first_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shopping_search_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shopping_search_intents_source_intent_type_normalized_key_language_key"
  ON "shopping_search_intents"("source", "intent_type", "normalized_key", "language");

CREATE INDEX IF NOT EXISTS "shopping_search_intents_source_search_count_idx"
  ON "shopping_search_intents"("source", "search_count");

CREATE INDEX IF NOT EXISTS "shopping_search_intents_last_searched_at_idx"
  ON "shopping_search_intents"("last_searched_at");

CREATE INDEX IF NOT EXISTS "shopping_search_intents_category_slug_idx"
  ON "shopping_search_intents"("category_slug");
