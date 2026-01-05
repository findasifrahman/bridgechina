-- Add payment tracking fields to ServiceRequest
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
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_proofs' AND column_name = 'amount'
  ) THEN
    ALTER TABLE "payment_proofs" ADD COLUMN "amount" DOUBLE PRECISION;
  END IF;
END $$;

