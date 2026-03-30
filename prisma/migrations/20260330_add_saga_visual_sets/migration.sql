CREATE TABLE IF NOT EXISTS "SagaVisualSet" (
  "id" TEXT NOT NULL,
  "visualSetId" TEXT NOT NULL,
  "sagaSlug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceSystem" TEXT,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SagaVisualSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SagaVisualSet_visualSetId_key" ON "SagaVisualSet"("visualSetId");
CREATE UNIQUE INDEX IF NOT EXISTS "SagaVisualSet_sagaSlug_key" ON "SagaVisualSet"("sagaSlug");
