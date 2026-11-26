-- Reconcile the Website's Supabase Data API grants and row-level policies.
-- Prisma owns the application tables; system_metadata remains managed by its
-- dedicated migration and is intentionally not modified here.
-- No INSERT/UPDATE/DELETE policy is created: writes stay server-side through Prisma.

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'BundleGroup',
    'BundleGroupItem',
    'IntellectualProperty',
    'Product',
    'Publication',
    'PublicationAsset',
    'PublicationVariant',
    'Series',
    'StudioSettings',
    'Checkout',
    'CheckoutItem',
    'CustomerLibrary',
    'User'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;

GRANT SELECT ON TABLE
  public."BundleGroup",
  public."BundleGroupItem",
  public."IntellectualProperty",
  public."Product",
  public."Publication",
  public."PublicationAsset",
  public."PublicationVariant",
  public."Series",
  public."StudioSettings"
TO anon, authenticated;

GRANT SELECT ON TABLE
  public."Checkout",
  public."CheckoutItem",
  public."CustomerLibrary",
  public."User"
TO authenticated;

DROP POLICY IF EXISTS "Public Read" ON public."BundleGroup";
CREATE POLICY "Public Read" ON public."BundleGroup"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."BundleGroupItem";
CREATE POLICY "Public Read" ON public."BundleGroupItem"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."IntellectualProperty";
CREATE POLICY "Public Read" ON public."IntellectualProperty"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."Product";
CREATE POLICY "Public Read" ON public."Product"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."Publication";
CREATE POLICY "Public Read" ON public."Publication"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."PublicationAsset";
CREATE POLICY "Public Read" ON public."PublicationAsset"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."PublicationVariant";
CREATE POLICY "Public Read" ON public."PublicationVariant"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."Series";
CREATE POLICY "Public Read" ON public."Series"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public."StudioSettings";
CREATE POLICY "Public Read" ON public."StudioSettings"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own checkouts" ON public."Checkout";
CREATE POLICY "Users can read own checkouts" ON public."Checkout"
  FOR SELECT TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can read own checkout items" ON public."CheckoutItem";
CREATE POLICY "Users can read own checkout items" ON public."CheckoutItem"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Checkout" AS checkout
      WHERE checkout."id" = "CheckoutItem"."checkoutId"
        AND checkout."userId" = (SELECT auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can read own library entries" ON public."CustomerLibrary";
CREATE POLICY "Users can read own library entries" ON public."CustomerLibrary"
  FOR SELECT TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Users can read own profile" ON public."User";
CREATE POLICY "Users can read own profile" ON public."User"
  FOR SELECT TO authenticated
  USING ("id" = (SELECT auth.uid())::text);
