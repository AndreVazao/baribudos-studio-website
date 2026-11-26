-- Production schema baseline, reconciled against the live PostgreSQL catalog on 2026-11-26.
-- This migration represents the Prisma-managed schema that predates the later
-- SagaVisualSet, PayPal capture-capability, Product publicationVariantId unique,
-- and PayPal capture-lease migrations.
-- Supabase-managed public.system_metadata and its grants/RLS are intentionally
-- excluded from Prisma ownership.
-- Existing production must mark this migration applied with prisma migrate resolve;
-- do not execute this baseline over the populated production schema.

CREATE TYPE "ProductType" AS ENUM ('EBOOK', 'AUDIOBOOK', 'VIDEO', 'BUNDLE');
CREATE TYPE "CheckoutProvider" AS ENUM ('STRIPE', 'PAYPAL');
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'CUSTOMER');

CREATE TABLE "StudioSettings" (
    "id" TEXT NOT NULL,
    "studioName" TEXT NOT NULL,
    "defaultIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntellectualProperty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntellectualProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volumeNumber" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "status" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "warningsJson" JSONB,
    "errorsJson" JSONB,
    "ipId" TEXT NOT NULL,
    "seriesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicationVariant" (
    "id" TEXT NOT NULL,
    "publicationIdRef" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT,
    "payloadJson" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicationVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicationAsset" (
    "id" TEXT NOT NULL,
    "variantIdRef" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicationAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "publicationVariantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BundleGroup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupType" TEXT NOT NULL DEFAULT 'bundle',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sourceSystem" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BundleGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BundleGroupItem" (
    "id" TEXT NOT NULL,
    "bundleIdRef" TEXT NOT NULL,
    "productId" TEXT,
    "productSlug" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "currency" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BundleGroupItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerLibrary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CheckoutProvider" NOT NULL,
    "providerRef" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckoutItem" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountCents" INTEGER NOT NULL,
    CONSTRAINT "CheckoutItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntellectualProperty_slug_key" ON "IntellectualProperty"("slug");
CREATE INDEX "idx_Series_ipId" ON "Series"("ipId");
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");
CREATE UNIQUE INDEX "Publication_publicationId_key" ON "Publication"("publicationId");
CREATE INDEX "idx_Publication_ipId" ON "Publication"("ipId");
CREATE INDEX "idx_Publication_seriesId" ON "Publication"("seriesId");
CREATE UNIQUE INDEX "PublicationVariant_variantId_key" ON "PublicationVariant"("variantId");
CREATE UNIQUE INDEX "PublicationVariant_slug_key" ON "PublicationVariant"("slug");
CREATE INDEX "idx_PublicationVariant_publicationIdRef" ON "PublicationVariant"("publicationIdRef");
CREATE INDEX "idx_PublicationAsset_variantIdRef" ON "PublicationAsset"("variantIdRef");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "idx_Product_publicationVariantId" ON "Product"("publicationVariantId");
CREATE UNIQUE INDEX "BundleGroup_groupId_key" ON "BundleGroup"("groupId");
CREATE UNIQUE INDEX "BundleGroup_slug_key" ON "BundleGroup"("slug");
CREATE INDEX "BundleGroupItem_bundleIdRef_position_idx" ON "BundleGroupItem"("bundleIdRef", "position");
CREATE UNIQUE INDEX "CustomerLibrary_userId_productId_key" ON "CustomerLibrary"("userId", "productId");
CREATE INDEX "idx_CustomerLibrary_productId" ON "CustomerLibrary"("productId");
CREATE UNIQUE INDEX "Checkout_providerRef_key" ON "Checkout"("providerRef");
CREATE INDEX "idx_Checkout_userId" ON "Checkout"("userId");
CREATE UNIQUE INDEX "CheckoutItem_checkoutId_productId_key" ON "CheckoutItem"("checkoutId", "productId");
CREATE INDEX "idx_CheckoutItem_productId" ON "CheckoutItem"("productId");

ALTER TABLE "Series"
    ADD CONSTRAINT "Series_ipId_fkey"
    FOREIGN KEY ("ipId") REFERENCES "IntellectualProperty"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Publication"
    ADD CONSTRAINT "Publication_ipId_fkey"
    FOREIGN KEY ("ipId") REFERENCES "IntellectualProperty"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Publication"
    ADD CONSTRAINT "Publication_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "Series"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicationVariant"
    ADD CONSTRAINT "PublicationVariant_publicationIdRef_fkey"
    FOREIGN KEY ("publicationIdRef") REFERENCES "Publication"("publicationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicationAsset"
    ADD CONSTRAINT "PublicationAsset_variantIdRef_fkey"
    FOREIGN KEY ("variantIdRef") REFERENCES "PublicationVariant"("variantId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_publicationVariantId_fkey"
    FOREIGN KEY ("publicationVariantId") REFERENCES "PublicationVariant"("variantId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BundleGroupItem"
    ADD CONSTRAINT "BundleGroupItem_bundleIdRef_fkey"
    FOREIGN KEY ("bundleIdRef") REFERENCES "BundleGroup"("groupId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerLibrary"
    ADD CONSTRAINT "CustomerLibrary_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerLibrary"
    ADD CONSTRAINT "CustomerLibrary_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Checkout"
    ADD CONSTRAINT "Checkout_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutItem"
    ADD CONSTRAINT "CheckoutItem_checkoutId_fkey"
    FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutItem"
    ADD CONSTRAINT "CheckoutItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
