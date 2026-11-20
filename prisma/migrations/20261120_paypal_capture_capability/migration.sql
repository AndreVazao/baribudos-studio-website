ALTER TABLE "Checkout"
  ADD COLUMN "captureCapabilityHash" TEXT,
  ADD COLUMN "captureCapabilityExpiresAt" TIMESTAMP(3),
  ADD COLUMN "captureCapabilityConsumedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Checkout_captureCapabilityHash_key"
  ON "Checkout"("captureCapabilityHash");
