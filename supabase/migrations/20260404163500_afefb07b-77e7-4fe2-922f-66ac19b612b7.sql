
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Org members can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage their org order items" ON public.order_items;
DROP POLICY IF EXISTS "Org members can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Order seller can insert items" ON public.order_items;
DROP POLICY IF EXISTS "Order seller can update items" ON public.order_items;
DROP POLICY IF EXISTS "Order seller can delete items" ON public.order_items;

-- SELECT: org members can view items in their org
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Org members can view order items') THEN
    CREATE POLICY "Org members can view order items"
    ON public.order_items FOR SELECT TO authenticated
    USING (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
    );
  END IF;
END $$;

-- INSERT: seller of the parent order or admin/manager
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Order seller can insert items') THEN
    CREATE POLICY "Order seller can insert items"
    ON public.order_items FOR INSERT TO authenticated
    WITH CHECK (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
      AND (
        is_manager_or_admin()
        OR EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- UPDATE: seller of the parent order or admin/manager
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Order seller can update items') THEN
    CREATE POLICY "Order seller can update items"
    ON public.order_items FOR UPDATE TO authenticated
    USING (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
      AND (
        is_manager_or_admin()
        OR EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

-- DELETE: seller of the parent order or admin/manager
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Order seller can delete items') THEN
    CREATE POLICY "Order seller can delete items"
    ON public.order_items FOR DELETE TO authenticated
    USING (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
      AND (
        is_manager_or_admin()
        OR EXISTS (
          SELECT 1 FROM public.orders
          WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
        )
      )
    );
  END IF;
END $$;
