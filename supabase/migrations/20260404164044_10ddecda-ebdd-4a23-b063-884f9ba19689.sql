
-- Fix order_items: handle NULL organization_id by falling back to seller ownership
DROP POLICY IF EXISTS "Org members can view order items" ON public.order_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Org members can view order items') THEN
    CREATE POLICY "Org members can view order items"
    ON public.order_items FOR SELECT TO authenticated
    USING (
      (organization_id IS NOT NULL AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
      OR (organization_id IS NULL AND EXISTS (
        SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
      ))
      OR is_manager_or_admin()
    );
  END IF;
END $$;

-- Also fix orders: handle NULL organization_id 
DROP POLICY IF EXISTS "Sellers can manage own org orders" ON public.orders;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can manage own org orders') THEN
    CREATE POLICY "Sellers can manage own org orders"
    ON public.orders FOR ALL TO authenticated
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
