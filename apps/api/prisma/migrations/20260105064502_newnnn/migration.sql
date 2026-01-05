-- AlterTable
ALTER TABLE "customer_profiles" ADD COLUMN     "avatar_asset_id" TEXT,
ADD COLUMN     "birth_year" INTEGER,
ADD COLUMN     "budget_preferences" JSONB,
ADD COLUMN     "city_of_residence" TEXT,
ADD COLUMN     "country_of_residence" TEXT,
ADD COLUMN     "dietary_preferences" JSONB,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_contact_channel" TEXT,
ADD COLUMN     "preferred_currency" TEXT,
ADD COLUMN     "travel_interests" JSONB,
ADD COLUMN     "wechat_id" TEXT;

-- CreateTable
CREATE TABLE "service_request_status_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status_from" TEXT,
    "status_to" TEXT NOT NULL,
    "note_internal" TEXT,
    "note_user" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_status_events_request_id_idx" ON "service_request_status_events"("request_id");

-- CreateIndex
CREATE INDEX "service_request_status_events_status_to_idx" ON "service_request_status_events"("status_to");

-- CreateIndex
CREATE INDEX "service_request_status_events_created_at_idx" ON "service_request_status_events"("created_at");

-- CreateIndex
CREATE INDEX "customer_profiles_marketing_consent_idx" ON "customer_profiles"("marketing_consent");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_status_events" ADD CONSTRAINT "service_request_status_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_status_events" ADD CONSTRAINT "service_request_status_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
