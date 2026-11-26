-- Guest purchases must have a secure path to claim their library account.
-- Existing placeholder-password accounts are converted to non-login guest accounts;
-- they must complete the one-time claim flow before setting a real password.

ALTER TABLE "User"
  ADD COLUMN "isGuestAccount" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isGuestAccount" = true
WHERE "passwordHash" = 'TEMP_EXTERNAL_CHECKOUT_ONLY';

ALTER TABLE "Checkout"
  ADD COLUMN "guestCheckout" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "guestClaimTokenHash" TEXT,
  ADD COLUMN "guestClaimExpiresAt" TIMESTAMP(3),
  ADD COLUMN "guestClaimConsumedAt" TIMESTAMP(3),
  ADD COLUMN "guestClaimEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "guestClaimEmailAttemptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Checkout_guestClaimTokenHash_key"
  ON "Checkout"("guestClaimTokenHash");

CREATE INDEX "Checkout_guestCheckout_guestClaimExpiresAt_idx"
  ON "Checkout"("guestCheckout", "guestClaimExpiresAt");
