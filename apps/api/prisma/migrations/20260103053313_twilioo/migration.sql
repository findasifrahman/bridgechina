/*
  Warnings:

  - A unique constraint covering the columns `[external_thread_key]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "assigned_user_id" TEXT,
ADD COLUMN     "external_channel" TEXT,
ADD COLUMN     "external_from" TEXT,
ADD COLUMN     "external_thread_key" TEXT,
ADD COLUMN     "external_to" TEXT,
ADD COLUMN     "last_inbound_at" TIMESTAMP(3),
ADD COLUMN     "last_message_preview" TEXT,
ADD COLUMN     "last_outbound_at" TIMESTAMP(3),
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'AI';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "direction" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "provider_sid" TEXT,
ADD COLUMN     "status" TEXT;

-- CreateTable
CREATE TABLE "twilio_webhook_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_sid" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twilio_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_message_statuses" (
    "id" TEXT NOT NULL,
    "provider_sid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twilio_message_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_title_translations" (
    "id" TEXT NOT NULL,
    "source_text" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_title_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "twilio_webhook_events_event_type_provider_sid_key" ON "twilio_webhook_events"("event_type", "provider_sid");

-- CreateIndex
CREATE INDEX "twilio_message_statuses_provider_sid_idx" ON "twilio_message_statuses"("provider_sid");

-- CreateIndex
CREATE UNIQUE INDEX "product_title_translations_source_text_key" ON "product_title_translations"("source_text");

-- CreateIndex
CREATE INDEX "conversations_external_from_idx" ON "conversations"("external_from");

-- CreateIndex
CREATE INDEX "conversations_mode_idx" ON "conversations"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_external_thread_key_key" ON "conversations"("external_thread_key");

-- CreateIndex
CREATE INDEX "messages_provider_sid_idx" ON "messages"("provider_sid");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
