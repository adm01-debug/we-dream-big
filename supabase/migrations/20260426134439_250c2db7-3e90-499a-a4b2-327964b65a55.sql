-- ─────────────────────────────────────────────────────────────────────────────
-- Padroniza policies das tabelas filhas para herdar propriedade do parent.
-- Espelha o padrão já usado em order_items.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── quote_items ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage quote items via quote ownership" ON public.quote_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'quote_items_select_scope') THEN
    CREATE POLICY "quote_items_select_scope"
    ON public.quote_items
    FOR SELECT
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_items.quote_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'quote_items_insert_scope') THEN
    CREATE POLICY "quote_items_insert_scope"
    ON public.quote_items
    FOR INSERT
    WITH CHECK (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_items.quote_id
          AND q.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'quote_items_update_scope') THEN
    CREATE POLICY "quote_items_update_scope"
    ON public.quote_items
    FOR UPDATE
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_items.quote_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    )
    WITH CHECK (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_items.quote_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'quote_items_delete_scope') THEN
    CREATE POLICY "quote_items_delete_scope"
    ON public.quote_items
    FOR DELETE
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_items.quote_id
          AND q.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ── quote_item_personalizations ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage personalizations via quote ownership" ON public.quote_item_personalizations;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'quote_item_personalizations_select_scope') THEN
    CREATE POLICY "quote_item_personalizations_select_scope"
    ON public.quote_item_personalizations
    FOR SELECT
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1
        FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'quote_item_personalizations_insert_scope') THEN
    CREATE POLICY "quote_item_personalizations_insert_scope"
    ON public.quote_item_personalizations
    FOR INSERT
    WITH CHECK (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1
        FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
          AND q.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'quote_item_personalizations_update_scope') THEN
    CREATE POLICY "quote_item_personalizations_update_scope"
    ON public.quote_item_personalizations
    FOR UPDATE
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1
        FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    )
    WITH CHECK (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1
        FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
          AND (
            q.seller_id = auth.uid()
            OR (
              has_role(auth.uid(), 'supervisor'::app_role)
              AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))
            )
          )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'quote_item_personalizations_delete_scope') THEN
    CREATE POLICY "quote_item_personalizations_delete_scope"
    ON public.quote_item_personalizations
    FOR DELETE
    USING (
      can_view_all_sales()
      OR EXISTS (
        SELECT 1
        FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
          AND q.seller_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Índices de suporte para performance dos EXISTS nas policies
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_personalizations_quote_item_id
  ON public.quote_item_personalizations(quote_item_id);