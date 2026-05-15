-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Sellers can delete their draft quotes" ON public.quotes;

-- Create a new policy allowing sellers to delete their own quotes (any status) and admins to delete any
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can delete their own quotes') THEN
    CREATE POLICY "Sellers can delete their own quotes"
      ON public.quotes
      FOR DELETE
      USING ((seller_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
