
-- Add organization_id to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON public.quotes(organization_id);

-- Add organization_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);

-- Add organization_id to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_order_items_organization_id ON public.order_items(organization_id);

-- Backfill: set organization_id from the user's first org membership
UPDATE public.quotes q
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = q.seller_id LIMIT 1
)
WHERE q.organization_id IS NULL;

UPDATE public.orders o
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = o.seller_id LIMIT 1
)
WHERE o.organization_id IS NULL;

UPDATE public.order_items oi
SET organization_id = (
  SELECT o.organization_id FROM public.orders o
  WHERE o.id = oi.order_id
  LIMIT 1
)
WHERE oi.organization_id IS NULL;

-- Drop existing RLS policies on quotes
DROP POLICY IF EXISTS "Sellers can manage own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Managers can read all quotes" ON public.quotes;

-- New org-scoped RLS policies for quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can manage own org quotes') THEN
    CREATE POLICY "Sellers can manage own org quotes"
    ON public.quotes FOR ALL
    TO authenticated
    USING (
      (seller_id = auth.uid() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      (seller_id = auth.uid() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Managers can read org quotes') THEN
    CREATE POLICY "Managers can read org quotes"
    ON public.quotes FOR SELECT
    TO authenticated
    USING (
      (is_manager_or_admin() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
    );
  END IF;
END $$;

-- Drop existing RLS policies on orders
DROP POLICY IF EXISTS "Sellers can manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can read all orders" ON public.orders;

-- New org-scoped RLS policies for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can manage own org orders') THEN
    CREATE POLICY "Sellers can manage own org orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (
      (seller_id = auth.uid() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      (seller_id = auth.uid() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Managers can read org orders') THEN
    CREATE POLICY "Managers can read org orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (
      (is_manager_or_admin() AND organization_id IN (SELECT get_user_org_ids(auth.uid())))
    );
  END IF;
END $$;

-- Drop existing RLS policies on order_items
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers can read own order items" ON public.order_items;

-- New org-scoped RLS policies for order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Users can manage org order items') THEN
    CREATE POLICY "Users can manage org order items"
    ON public.order_items FOR ALL
    TO authenticated
    USING (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (
      organization_id IN (SELECT get_user_org_ids(auth.uid()))
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;
