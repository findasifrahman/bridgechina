-- AlterTable
ALTER TABLE "service_provider_profiles" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "bundle_key" TEXT,
ADD COLUMN     "created_from_conversation_id" TEXT,
ADD COLUMN     "dispatched_at" TIMESTAMP(3),
ADD COLUMN     "first_ops_approval_at" TIMESTAMP(3),
ADD COLUMN     "first_provider_response_at" TIMESTAMP(3),
ADD COLUMN     "ops_last_action_at" TIMESTAMP(3),
ADD COLUMN     "sla_due_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "provider_dispatches" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_offers" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "provider_note" TEXT,
    "payload_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "sent_to_user_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_message_contexts" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "user_message_text" TEXT NOT NULL,
    "extracted_summary" TEXT,
    "extracted_payload" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_message_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_dispatches_request_id_idx" ON "provider_dispatches"("request_id");

-- CreateIndex
CREATE INDEX "provider_dispatches_provider_user_id_idx" ON "provider_dispatches"("provider_user_id");

-- CreateIndex
CREATE INDEX "provider_dispatches_status_idx" ON "provider_dispatches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_dispatches_request_id_provider_user_id_key" ON "provider_dispatches"("request_id", "provider_user_id");

-- CreateIndex
CREATE INDEX "provider_offers_request_id_idx" ON "provider_offers"("request_id");

-- CreateIndex
CREATE INDEX "provider_offers_provider_user_id_idx" ON "provider_offers"("provider_user_id");

-- CreateIndex
CREATE INDEX "provider_offers_status_idx" ON "provider_offers"("status");

-- CreateIndex
CREATE INDEX "provider_offers_service_type_idx" ON "provider_offers"("service_type");

-- CreateIndex
CREATE INDEX "provider_message_contexts_request_id_idx" ON "provider_message_contexts"("request_id");

-- CreateIndex
CREATE INDEX "provider_message_contexts_conversation_id_idx" ON "provider_message_contexts"("conversation_id");

-- CreateIndex
CREATE INDEX "service_provider_profiles_is_default_idx" ON "service_provider_profiles"("is_default");

-- CreateIndex
CREATE INDEX "service_requests_created_from_conversation_id_idx" ON "service_requests"("created_from_conversation_id");

-- CreateIndex
CREATE INDEX "service_requests_bundle_key_idx" ON "service_requests"("bundle_key");

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_created_from_conversation_id_fkey" FOREIGN KEY ("created_from_conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_dispatches" ADD CONSTRAINT "provider_dispatches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_dispatches" ADD CONSTRAINT "provider_dispatches_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_offers" ADD CONSTRAINT "provider_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_offers" ADD CONSTRAINT "provider_offers_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_offers" ADD CONSTRAINT "provider_offers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_message_contexts" ADD CONSTRAINT "provider_message_contexts_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_message_contexts" ADD CONSTRAINT "provider_message_contexts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
