-- SagaVisualSet is public catalog metadata, not a private customer table.
-- Supabase grants/policies are conditional so this Prisma migration also runs
-- against ordinary PostgreSQL test databases without Supabase roles.

ALTER TABLE "SagaVisualSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SagaVisualSet" ALTER COLUMN "updatedAt" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "SagaVisualSet" FROM anon, authenticated;
    GRANT SELECT ON TABLE "SagaVisualSet" TO anon, authenticated;
    DROP POLICY IF EXISTS "Public Read" ON "SagaVisualSet";
    CREATE POLICY "Public Read" ON "SagaVisualSet"
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
