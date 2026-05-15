
-- Fix: allow sellers to access their own quotes even when organization_id is NULL
DROP POLICY IF EXISTS "Sellers can manage own org quotes" ON public.quotes;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can manage own org quotes') THEN
    CREATE POLICY "Sellers can manage own org quotes"
    ON public.quotes FOR ALL TO authenticated
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        seller_id = auth.uid()
        AND (
          organization_id IS NULL
          OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
        )
      )
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        seller_id = auth.uid()
        AND (
          organization_id IS NULL
          OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
        )
      )
    );
  END IF;
END $$;
