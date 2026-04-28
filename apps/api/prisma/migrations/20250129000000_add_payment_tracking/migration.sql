-- Add payment tracking fields to ServiceRequest
CREATE TABLE IF NOT EXISTS "service_requests" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "user_id" TEXT,
    "lead_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_to" TEXT,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "request_payload" JSONB NOT NULL,
    "created_from_conversation_id" TEXT,
    "bundle_key" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "first_provider_response_at" TIMESTAMP(3),
    "first_ops_approval_at" TIMESTAMP(3),
    "ops_last_action_at" TIMESTAMP(3),
    "sla_due_at" TIMESTAMP(3),
    "total_amount" DOUBLE PRECISION,
    "paid_amount" DOUBLE PRECISION DEFAULT 0,
    "due_amount" DOUBLE PRECISION,
    "is_fully_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "total_amount" DOUBLE PRECISION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "paid_amount" DOUBLE PRECISION DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'due_amount'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "due_amount" DOUBLE PRECISION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'is_fully_paid'
  ) THEN
    ALTER TABLE "service_requests" ADD COLUMN "is_fully_paid" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add amount field to PaymentProof
CREATE TABLE IF NOT EXISTS "payment_proofs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_proofs' AND column_name = 'amount'
  ) THEN
    ALTER TABLE "payment_proofs" ADD COLUMN "amount" DOUBLE PRECISION;
  END IF;
END $$;

