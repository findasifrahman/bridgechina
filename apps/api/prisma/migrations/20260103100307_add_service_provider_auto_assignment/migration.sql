-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_by" TEXT,
ADD COLUMN     "category_key" TEXT,
ADD COLUMN     "first_human_reply_at" TIMESTAMP(3),
ADD COLUMN     "first_human_takeover_at" TIMESTAMP(3),
ADD COLUMN     "mode_changed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "service_provider_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB,
    "city_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_profiles_user_id_key" ON "service_provider_profiles"("user_id");

-- CreateIndex
CREATE INDEX "service_provider_profiles_is_active_idx" ON "service_provider_profiles"("is_active");

-- CreateIndex
CREATE INDEX "service_provider_profiles_city_id_idx" ON "service_provider_profiles"("city_id");

-- CreateIndex
CREATE INDEX "conversations_category_key_idx" ON "conversations"("category_key");

-- CreateIndex
CREATE INDEX "conversations_assigned_user_id_idx" ON "conversations"("assigned_user_id");

-- AddForeignKey
ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
