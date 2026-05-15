-- Fix CRITICAL: order_items SELECT policy is too permissive (USING true)
DROP POLICY IF EXISTS "Sellers can read order items" ON public.order_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Sellers can read own order items') THEN
    CREATE POLICY "Sellers can read own order items"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_manager_or_admin())
      )
    );
  END IF;
END $$;

-- Fix WARN: login_attempts INSERT allows forging records
DROP POLICY IF EXISTS "Authenticated can insert login attempts" ON public.login_attempts;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_attempts' AND policyname = 'Users can insert own login attempts') THEN
    CREATE POLICY "Users can insert own login attempts"
    ON public.login_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
      OR user_id = auth.uid()
      OR user_id IS NULL
    );
  END IF;
END $$;