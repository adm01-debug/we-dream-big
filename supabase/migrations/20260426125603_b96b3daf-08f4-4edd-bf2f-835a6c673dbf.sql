-- ============================================================
-- 1. HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_seller_only(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'vendedor'::public.app_role)
     AND NOT public.can_manage_quotes(_user_id)
     AND NOT public.is_admin_strict(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin_strict(_user_id)
      OR public.has_role(_user_id,'manager'::public.app_role)
      OR public.has_role(_user_id,'dev'::public.app_role)
$$;

-- ============================================================
-- 2. TRIGGER PARA AUTO-PREENCHER seller_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_seller_id_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.seller_id IS NULL THEN
    NEW.seller_id := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_seller_id_default_quotes ON public.quotes;
DROP TRIGGER IF EXISTS trg_set_seller_id_default_quotes ON public.quotes;
CREATE TRIGGER trg_set_seller_id_default_quotes
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_default();

DROP TRIGGER IF EXISTS trg_set_seller_id_default_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_set_seller_id_default_orders ON public.orders;
CREATE TRIGGER trg_set_seller_id_default_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_default();

DROP TRIGGER IF EXISTS trg_set_seller_id_default_qtemplates ON public.quote_templates;
DROP TRIGGER IF EXISTS trg_set_seller_id_default_qtemplates ON public.quote_templates;
CREATE TRIGGER trg_set_seller_id_default_qtemplates
  BEFORE INSERT ON public.quote_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_default();

DROP TRIGGER IF EXISTS trg_set_seller_id_default_qatokens ON public.quote_approval_tokens;
DROP TRIGGER IF EXISTS trg_set_seller_id_default_qatokens ON public.quote_approval_tokens;
CREATE TRIGGER trg_set_seller_id_default_qatokens
  BEFORE INSERT ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_default();

DROP TRIGGER IF EXISTS trg_set_seller_id_default_dar ON public.discount_approval_requests;
DROP TRIGGER IF EXISTS trg_set_seller_id_default_dar ON public.discount_approval_requests;
CREATE TRIGGER trg_set_seller_id_default_dar
  BEFORE INSERT ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_seller_id_default();

-- ============================================================
-- 3. QUOTES
-- ============================================================
DROP POLICY IF EXISTS "Sellers can manage own org quotes" ON public.quotes;
DROP POLICY IF EXISTS "Managers can read org quotes" ON public.quotes;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_select_scope') THEN
    CREATE POLICY "quotes_select_scope" ON public.quotes
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_insert_scope') THEN
    CREATE POLICY "quotes_insert_scope" ON public.quotes
    FOR INSERT TO authenticated WITH CHECK (
      public.can_view_all_sales()
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_update_scope') THEN
    CREATE POLICY "quotes_update_scope" ON public.quotes
    FOR UPDATE TO authenticated
    USING (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    )
    WITH CHECK (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_delete_scope') THEN
    CREATE POLICY "quotes_delete_scope" ON public.quotes
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales()
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

-- ============================================================
-- 4. ORDERS
-- ============================================================
DROP POLICY IF EXISTS "Sellers can manage own org orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can read org orders" ON public.orders;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_select_scope') THEN
    CREATE POLICY "orders_select_scope" ON public.orders
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_insert_scope') THEN
    CREATE POLICY "orders_insert_scope" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (
      public.can_view_all_sales()
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_update_scope') THEN
    CREATE POLICY "orders_update_scope" ON public.orders
    FOR UPDATE TO authenticated
    USING (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    )
    WITH CHECK (
      public.can_view_all_sales()
      OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
          AND (organization_id IS NULL
               OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_delete_scope') THEN
    CREATE POLICY "orders_delete_scope" ON public.orders
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales()
      OR seller_id = auth.uid()
    );
  END IF;
END $$;

-- ============================================================
-- 5. ORDER_ITEMS (WITH CHECK simétrico)
-- ============================================================
DROP POLICY IF EXISTS "Order seller can insert items" ON public.order_items;
DROP POLICY IF EXISTS "Order seller can update items" ON public.order_items;
DROP POLICY IF EXISTS "Order seller can delete items" ON public.order_items;
DROP POLICY IF EXISTS "Org members can view order items" ON public.order_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_select_scope') THEN
    CREATE POLICY "order_items_select_scope" ON public.order_items
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id::uuid
          AND (o.seller_id = auth.uid()
               OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
                   AND (o.organization_id IS NULL
                        OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_insert_scope') THEN
    CREATE POLICY "order_items_insert_scope" ON public.order_items
    FOR INSERT TO authenticated WITH CHECK (
      public.can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id::uuid
          AND o.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_update_scope') THEN
    CREATE POLICY "order_items_update_scope" ON public.order_items
    FOR UPDATE TO authenticated
    USING (
      public.can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id::uuid
          AND (o.seller_id = auth.uid()
               OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
                   AND (o.organization_id IS NULL
                        OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
      )
    )
    WITH CHECK (
      public.can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id::uuid
          AND (o.seller_id = auth.uid()
               OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
                   AND (o.organization_id IS NULL
                        OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_delete_scope') THEN
    CREATE POLICY "order_items_delete_scope" ON public.order_items
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id::uuid
          AND o.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ============================================================
-- 6. QUOTE_TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "Sellers can manage own templates" ON public.quote_templates;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'qtemplates_select_scope') THEN
    CREATE POLICY "qtemplates_select_scope" ON public.quote_templates
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'qtemplates_insert_scope') THEN
    CREATE POLICY "qtemplates_insert_scope" ON public.quote_templates
    FOR INSERT TO authenticated WITH CHECK (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'qtemplates_update_scope') THEN
    CREATE POLICY "qtemplates_update_scope" ON public.quote_templates
    FOR UPDATE TO authenticated
    USING (public.can_view_all_sales() OR seller_id = auth.uid())
    WITH CHECK (public.can_view_all_sales() OR seller_id = auth.uid());
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'qtemplates_delete_scope') THEN
    CREATE POLICY "qtemplates_delete_scope" ON public.quote_templates
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;

-- ============================================================
-- 7. QUOTE_APPROVAL_TOKENS
-- ============================================================
DROP POLICY IF EXISTS "Sellers can select own tokens" ON public.quote_approval_tokens;
DROP POLICY IF EXISTS "Sellers can insert own tokens" ON public.quote_approval_tokens;
DROP POLICY IF EXISTS "Sellers can update own tokens" ON public.quote_approval_tokens;
DROP POLICY IF EXISTS "Sellers can delete own tokens" ON public.quote_approval_tokens;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'qatokens_select_scope') THEN
    CREATE POLICY "qatokens_select_scope" ON public.quote_approval_tokens
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'qatokens_insert_scope') THEN
    CREATE POLICY "qatokens_insert_scope" ON public.quote_approval_tokens
    FOR INSERT TO authenticated WITH CHECK (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'qatokens_update_scope') THEN
    CREATE POLICY "qatokens_update_scope" ON public.quote_approval_tokens
    FOR UPDATE TO authenticated
    USING (public.can_view_all_sales() OR seller_id = auth.uid())
    WITH CHECK (public.can_view_all_sales() OR seller_id = auth.uid());
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'qatokens_delete_scope') THEN
    CREATE POLICY "qatokens_delete_scope" ON public.quote_approval_tokens
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales() OR seller_id = auth.uid()
    );
  END IF;
END $$;

-- ============================================================
-- 8. DISCOUNT_APPROVAL_REQUESTS (limpa duplicatas)
-- ============================================================
DROP POLICY IF EXISTS "Supervisors can manage all approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can create approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can create own approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can read own approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can view own approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.discount_approval_requests;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'dar_select_scope') THEN
    CREATE POLICY "dar_select_scope" ON public.discount_approval_requests
    FOR SELECT TO authenticated USING (
      public.can_view_all_sales()
      OR public.has_role(auth.uid(),'supervisor'::public.app_role)
      OR seller_id = auth.uid()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'dar_insert_scope') THEN
    CREATE POLICY "dar_insert_scope" ON public.discount_approval_requests
    FOR INSERT TO authenticated WITH CHECK (
      seller_id = auth.uid() OR public.can_view_all_sales()
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'dar_update_scope') THEN
    CREATE POLICY "dar_update_scope" ON public.discount_approval_requests
    FOR UPDATE TO authenticated
    USING (
      public.can_view_all_sales()
      OR public.has_role(auth.uid(),'supervisor'::public.app_role)
    )
    WITH CHECK (
      public.can_view_all_sales()
      OR public.has_role(auth.uid(),'supervisor'::public.app_role)
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'dar_delete_scope') THEN
    CREATE POLICY "dar_delete_scope" ON public.discount_approval_requests
    FOR DELETE TO authenticated USING (
      public.can_view_all_sales()
    );
  END IF;
END $$;

-- ============================================================
-- 9. QUOTE_COMMENTS — WITH CHECK simétrico
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own comments" ON public.quote_comments;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'qcomments_insert_scope') THEN
    CREATE POLICY "qcomments_insert_scope" ON public.quote_comments
    FOR INSERT TO authenticated WITH CHECK (
      user_id = auth.uid() AND (
        public.can_view_all_sales()
        OR EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.id = quote_comments.quote_id
            AND (q.seller_id = auth.uid()
                 OR (public.has_role(auth.uid(),'supervisor'::public.app_role)
                     AND (q.organization_id IS NULL
                          OR q.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
        )
      )
    );
  END IF;
END $$;
