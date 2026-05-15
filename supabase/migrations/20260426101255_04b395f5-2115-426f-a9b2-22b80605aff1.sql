
CREATE OR REPLACE FUNCTION public.can_manage_quotes(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('supervisor'::public.app_role, 'admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_discount(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.can_manage_quotes(_user_id)
$$;

-- QUOTES
DROP POLICY IF EXISTS "Sellers can manage own org quotes" ON public.quotes;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can manage own org quotes') THEN
    CREATE POLICY "Sellers can manage own org quotes"
    ON public.quotes FOR ALL TO authenticated
    USING (
      public.can_manage_quotes(auth.uid())
      OR (seller_id = auth.uid()
          AND (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
    )
    WITH CHECK (
      public.can_manage_quotes(auth.uid())
      OR (seller_id = auth.uid()
          AND (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
    );
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can manage quote items via quote ownership" ON public.quote_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'Users can manage quote items via quote ownership') THEN
    CREATE POLICY "Users can manage quote items via quote ownership"
    ON public.quote_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can manage history via quote ownership" ON public.quote_history;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_history' AND policyname = 'Users can manage history via quote ownership') THEN
    CREATE POLICY "Users can manage history via quote ownership"
    ON public.quote_history FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can manage personalizations via quote ownership" ON public.quote_item_personalizations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'Users can manage personalizations via quote ownership') THEN
    CREATE POLICY "Users can manage personalizations via quote ownership"
    ON public.quote_item_personalizations FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND (q.seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))));
  END IF;
END $$;

DROP POLICY IF EXISTS "Sellers can manage own templates" ON public.quote_templates;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can manage own templates') THEN
    CREATE POLICY "Sellers can manage own templates"
    ON public.quote_templates FOR ALL TO authenticated
    USING (seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()))
    WITH CHECK (seller_id = auth.uid() OR public.can_manage_quotes(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can read own or admin comments" ON public.quote_comments;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can read own or admin comments') THEN
    CREATE POLICY "Users can read own or admin comments"
    ON public.quote_comments FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can delete own comments" ON public.quote_comments;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments"
    ON public.quote_comments FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.can_manage_quotes(auth.uid()));
  END IF;
END $$;

-- ORDERS
DROP POLICY IF EXISTS "Sellers can manage own org orders" ON public.orders;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can manage own org orders') THEN
    CREATE POLICY "Sellers can manage own org orders"
    ON public.orders FOR ALL TO authenticated
    USING (
      public.can_manage_quotes(auth.uid())
      OR (seller_id = auth.uid()
          AND (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
    )
    WITH CHECK (
      public.can_manage_quotes(auth.uid())
      OR (seller_id = auth.uid()
          AND (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
    );
  END IF;
END $$;

-- DISCOUNTS (somente supervisor aprova)
DROP POLICY IF EXISTS "Admins can manage all approval requests" ON public.discount_approval_requests;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Supervisors can manage all approval requests') THEN
    CREATE POLICY "Supervisors can manage all approval requests"
    ON public.discount_approval_requests FOR ALL TO authenticated
    USING (public.can_approve_discount(auth.uid()))
    WITH CHECK (public.can_approve_discount(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage all discount limits" ON public.seller_discount_limits;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_discount_limits' AND policyname = 'Supervisors can manage all discount limits') THEN
    CREATE POLICY "Supervisors can manage all discount limits"
    ON public.seller_discount_limits FOR ALL TO authenticated
    USING (public.can_approve_discount(auth.uid()))
    WITH CHECK (public.can_approve_discount(auth.uid()));
  END IF;
END $$;

-- Substituição em massa nas demais policies
DO $migration$
DECLARE
  _excluded text[] := ARRAY[
    'quotes','quote_items','quote_history','quote_item_personalizations',
    'quote_templates','quote_comments','orders',
    'discount_approval_requests','seller_discount_limits'
  ];
  _rec record;
  _new_qual text;
  _new_check text;
  _sql text;
  _cmd_kw text;
BEGIN
  FOR _rec IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND NOT (tablename = ANY(_excluded))
      AND (
        qual ILIKE '%''admin''::app_role%'
        OR with_check ILIKE '%''admin''::app_role%'
      )
  LOOP
    _new_qual := regexp_replace(
      coalesce(_rec.qual, ''),
      'has_role\(\s*auth\.uid\(\)\s*,\s*''admin''::app_role\s*\)',
      'public.is_admin(auth.uid())',
      'gi'
    );
    _new_check := regexp_replace(
      coalesce(_rec.with_check, ''),
      'has_role\(\s*auth\.uid\(\)\s*,\s*''admin''::app_role\s*\)',
      'public.is_admin(auth.uid())',
      'gi'
    );

    _cmd_kw := CASE _rec.cmd
      WHEN 'ALL' THEN 'ALL'
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      ELSE 'ALL'
    END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   _rec.policyname, _rec.schemaname, _rec.tablename);

    _sql := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
                   _rec.policyname, _rec.schemaname, _rec.tablename,
                   _cmd_kw,
                   array_to_string(_rec.roles, ', '));

    IF _rec.qual IS NOT NULL AND _new_qual <> '' AND _cmd_kw <> 'INSERT' THEN
      _sql := _sql || format(' USING (%s)', _new_qual);
    END IF;

    IF _rec.with_check IS NOT NULL AND _new_check <> '' AND _cmd_kw IN ('INSERT','UPDATE','ALL') THEN
      _sql := _sql || format(' WITH CHECK (%s)', _new_check);
    END IF;

    EXECUTE _sql;
  END LOOP;
END
$migration$;
