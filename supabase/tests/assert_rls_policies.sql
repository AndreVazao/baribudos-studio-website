DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public."Product"', 'SELECT') THEN
    RAISE EXCEPTION 'anon must be able to read the public product catalogue';
  END IF;
  IF has_table_privilege('anon', 'public."Product"', 'INSERT') THEN
    RAISE EXCEPTION 'anon must not be able to write Product';
  END IF;
  IF has_table_privilege('anon', 'public."Checkout"', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not be able to read Checkout';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public."Checkout"', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated must have SELECT on Checkout';
  END IF;
  IF has_table_privilege('authenticated', 'public."Checkout"', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated must not be able to write Checkout';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Checkout'
      AND policyname = 'Users can read own checkouts'
  ) THEN
    RAISE EXCEPTION 'owner-scoped Checkout policy is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'SagaVisualSet'
      AND policyname = 'Public Read'
  ) THEN
    RAISE EXCEPTION 'SagaVisualSet public-read policy is missing';
  END IF;
END $$;
