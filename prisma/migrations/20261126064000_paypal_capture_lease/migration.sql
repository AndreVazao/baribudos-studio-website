ALTER TABLE "Checkout"
  ADD COLUMN "captureLeaseId" TEXT,
  ADD COLUMN "captureLeaseExpiresAt" TIMESTAMP(3);

CREATE INDEX "Checkout_status_captureLeaseExpiresAt_idx"
  ON "Checkout"("status", "captureLeaseExpiresAt");
