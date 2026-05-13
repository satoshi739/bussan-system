-- Add LITE to Plan enum (positioned between FREE and STANDARD by reorder is not possible,
-- so just append; ordering does not affect business logic).
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'LITE';

-- StripeEvent: webhook idempotency table
CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeEvent_eventId_key" ON "StripeEvent"("eventId");
