-- ============================================================
-- GIFTS STORE - APLICAR RLS NAS TABELAS RESTANTES
-- Aplica Row Level Security nas tabelas que ficaram sem proteção
-- Data: 03/01/2025
-- VERSÃO DEFENSIVA: Todas as operações verificam existência das tabelas
-- ============================================================

-- ============================================================
-- PARTE 1: HABILITAR RLS EM TODAS AS TABELAS RESTANTES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_favorites') THEN
    ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_filter_presets') THEN
    ALTER TABLE public.user_filter_presets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_filters') THEN
    ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='push_subscriptions') THEN
    ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_preferences') THEN
    ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views') THEN
    ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_reviews') THEN
    ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_comparisons') THEN
    ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_price_history') THEN
    ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_comments') THEN
    ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_versions') THEN
    ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_templates') THEN
    ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_contacts') THEN
    ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_notes') THEN
    ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='search_queries') THEN
    ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log') THEN
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sync_jobs') THEN
    ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    ALTER TABLE public.mockup_approval_links ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_templates') THEN
    ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- PARTE 2: POLICIES - USER FAVORITES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_favorites') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='users_view_own_favorites') THEN
      CREATE POLICY "users_view_own_favorites"
      ON public.user_favorites FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='users_create_own_favorites') THEN
      CREATE POLICY "users_create_own_favorites"
      ON public.user_favorites FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='users_delete_own_favorites') THEN
      CREATE POLICY "users_delete_own_favorites"
      ON public.user_favorites FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 3: POLICIES - USER FILTER PRESETS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_filter_presets') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_filter_presets' AND policyname='users_view_own_presets') THEN
      CREATE POLICY "users_view_own_presets"
      ON public.user_filter_presets FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_filter_presets' AND policyname='users_manage_own_presets') THEN
      CREATE POLICY "users_manage_own_presets"
      ON public.user_filter_presets FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 4: POLICIES - SAVED FILTERS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_filters') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='saved_filters' AND policyname='users_view_own_filters') THEN
      CREATE POLICY "users_view_own_filters"
      ON public.saved_filters FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='saved_filters' AND policyname='users_manage_own_filters') THEN
      CREATE POLICY "users_manage_own_filters"
      ON public.saved_filters FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 5: POLICIES - PUSH SUBSCRIPTIONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='push_subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_subscriptions' AND policyname='users_view_own_subscriptions') THEN
      CREATE POLICY "users_view_own_subscriptions"
      ON public.push_subscriptions FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_subscriptions' AND policyname='users_manage_own_subscriptions') THEN
      CREATE POLICY "users_manage_own_subscriptions"
      ON public.push_subscriptions FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 6: POLICIES - NOTIFICATION PREFERENCES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_preferences') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_preferences' AND policyname='users_view_own_notification_prefs') THEN
      CREATE POLICY "users_view_own_notification_prefs"
      ON public.notification_preferences FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_preferences' AND policyname='users_manage_own_notification_prefs') THEN
      CREATE POLICY "users_manage_own_notification_prefs"
      ON public.notification_preferences FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 7: POLICIES - PRODUCT VIEWS (ANALYTICS)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='org_members_view_product_views') THEN
      CREATE POLICY "org_members_view_product_views"
      ON public.product_views FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_views.product_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='authenticated_create_product_views') THEN
      CREATE POLICY "authenticated_create_product_views"
      ON public.product_views FOR INSERT
      TO authenticated
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 8: POLICIES - PRODUCT REVIEWS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_reviews')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='org_members_view_product_reviews') THEN
      CREATE POLICY "org_members_view_product_reviews"
      ON public.product_reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_reviews.product_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='org_members_create_reviews') THEN
      CREATE POLICY "org_members_create_reviews"
      ON public.product_reviews FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_reviews.product_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='users_manage_own_reviews') THEN
      CREATE POLICY "users_manage_own_reviews"
      ON public.product_reviews FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 9: POLICIES - PRODUCT COMPARISONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_comparisons') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_comparisons' AND policyname='users_view_own_comparisons') THEN
      CREATE POLICY "users_view_own_comparisons"
      ON public.product_comparisons FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_comparisons' AND policyname='users_manage_own_comparisons') THEN
      CREATE POLICY "users_manage_own_comparisons"
      ON public.product_comparisons FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 10: POLICIES - PRODUCT PRICE HISTORY
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_price_history')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_history' AND policyname='org_members_view_price_history') THEN
      CREATE POLICY "org_members_view_price_history"
      ON public.product_price_history FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_price_history.product_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_history' AND policyname='admins_create_price_history') THEN
      CREATE POLICY "admins_create_price_history"
      ON public.product_price_history FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_price_history.product_id
            AND public.is_org_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 11: POLICIES - QUOTE COMMENTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_comments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_comments' AND policyname='org_members_view_quote_comments') THEN
      CREATE POLICY "org_members_view_quote_comments"
      ON public.quote_comments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quotes
          WHERE id = quote_comments.quote_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_comments' AND policyname='org_members_create_quote_comments') THEN
      CREATE POLICY "org_members_create_quote_comments"
      ON public.quote_comments FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quotes
          WHERE id = quote_comments.quote_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_comments' AND policyname='users_manage_own_comments') THEN
      CREATE POLICY "users_manage_own_comments"
      ON public.quote_comments FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 12: POLICIES - QUOTE VERSIONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_versions')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_versions' AND policyname='org_members_view_quote_versions') THEN
      CREATE POLICY "org_members_view_quote_versions"
      ON public.quote_versions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quotes
          WHERE id = quote_versions.quote_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_versions' AND policyname='system_create_quote_versions') THEN
      CREATE POLICY "system_create_quote_versions"
      ON public.quote_versions FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quotes
          WHERE id = quote_versions.quote_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 13: POLICIES - QUOTE TEMPLATES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_templates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_templates' AND policyname='org_members_view_quote_templates') THEN
      CREATE POLICY "org_members_view_quote_templates"
      ON public.quote_templates FOR SELECT
      TO authenticated
      USING (
        organization_id IS NULL OR
        public.user_is_org_member(organization_id)
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_templates' AND policyname='admins_create_quote_templates') THEN
      CREATE POLICY "admins_create_quote_templates"
      ON public.quote_templates FOR INSERT
      TO authenticated
      WITH CHECK (
        organization_id IS NULL OR
        public.is_org_admin(organization_id)
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_templates' AND policyname='admins_manage_quote_templates') THEN
      CREATE POLICY "admins_manage_quote_templates"
      ON public.quote_templates FOR ALL
      TO authenticated
      USING (public.is_org_admin(organization_id))
      WITH CHECK (public.is_org_admin(organization_id));
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 14: POLICIES - CLIENT CONTACTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_contacts')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bitrix_clients' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_contacts' AND policyname='org_members_view_client_contacts') THEN
      CREATE POLICY "org_members_view_client_contacts"
      ON public.client_contacts FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_contacts.client_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_contacts' AND policyname='org_members_create_client_contacts') THEN
      CREATE POLICY "org_members_create_client_contacts"
      ON public.client_contacts FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_contacts.client_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_contacts' AND policyname='admins_manage_client_contacts') THEN
      CREATE POLICY "admins_manage_client_contacts"
      ON public.client_contacts FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_contacts.client_id
            AND public.is_org_admin(organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_contacts.client_id
            AND public.is_org_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 15: POLICIES - CLIENT NOTES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_notes')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bitrix_clients' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_notes' AND policyname='org_members_view_client_notes') THEN
      CREATE POLICY "org_members_view_client_notes"
      ON public.client_notes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_notes.client_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_notes' AND policyname='org_members_create_client_notes') THEN
      CREATE POLICY "org_members_create_client_notes"
      ON public.client_notes FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_notes.client_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_notes' AND policyname='creators_or_admins_manage_notes') THEN
      CREATE POLICY "creators_or_admins_manage_notes"
      ON public.client_notes FOR ALL
      TO authenticated
      USING (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_notes.client_id
            AND public.is_org_admin(organization_id)
        )
      )
      WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.bitrix_clients
          WHERE id = client_notes.client_id
            AND public.is_org_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 16: POLICIES - ANALYTICS EVENTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='admins_view_analytics')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_organizations') THEN
      CREATE POLICY "admins_view_analytics"
      ON public.analytics_events FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='system_create_analytics') THEN
      CREATE POLICY "system_create_analytics"
      ON public.analytics_events FOR INSERT
      TO authenticated
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 17: POLICIES - SEARCH QUERIES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='search_queries') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='search_queries' AND policyname='users_view_own_searches') THEN
      CREATE POLICY "users_view_own_searches"
      ON public.search_queries FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='search_queries' AND policyname='authenticated_create_searches') THEN
      CREATE POLICY "authenticated_create_searches"
      ON public.search_queries FOR INSERT
      TO authenticated
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 18: POLICIES - AUDIT LOG (ADMIN ONLY)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_log' AND policyname='owners_view_audit_log')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_organizations') THEN
      CREATE POLICY "owners_view_audit_log"
      ON public.audit_log FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role = 'owner'
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_log' AND policyname='system_create_audit_log') THEN
      CREATE POLICY "system_create_audit_log"
      ON public.audit_log FOR INSERT
      TO authenticated
      WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 19: POLICIES - SYNC JOBS (ADMIN ONLY)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sync_jobs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_jobs' AND policyname='admins_view_sync_jobs')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_organizations') THEN
      CREATE POLICY "admins_view_sync_jobs"
      ON public.sync_jobs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_jobs' AND policyname='system_create_sync_jobs') THEN
      CREATE POLICY "system_create_sync_jobs"
      ON public.sync_jobs FOR INSERT
      TO authenticated
      WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_jobs' AND policyname='admins_update_sync_jobs')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_organizations') THEN
      CREATE POLICY "admins_update_sync_jobs"
      ON public.sync_jobs FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 20: POLICIES - MOCKUP APPROVAL LINKS (PUBLIC)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='public_view_approval_links')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_approval_links' AND column_name='is_active') THEN
      CREATE POLICY "public_view_approval_links"
      ON public.mockup_approval_links FOR SELECT
      TO anon, authenticated
      USING (is_active = true AND expires_at > NOW());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='org_members_create_approval_links')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_generation_jobs' AND column_name='organization_id') THEN
      CREATE POLICY "org_members_create_approval_links"
      ON public.mockup_approval_links FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.mockup_generation_jobs
          WHERE id = mockup_approval_links.job_id
            AND public.user_is_org_member(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 21: POLICIES - NOTIFICATION TEMPLATES (GLOBAL)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_templates' AND policyname='all_view_active_templates')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_templates' AND column_name='is_active') THEN
      CREATE POLICY "all_view_active_templates"
      ON public.notification_templates FOR SELECT
      TO authenticated
      USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_templates' AND policyname='admins_manage_templates')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_organizations') THEN
      CREATE POLICY "admins_manage_templates"
      ON public.notification_templates FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_organizations
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 22: GRANTS (defensivos)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_favorites') THEN
    GRANT SELECT ON public.user_favorites TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_filter_presets') THEN
    GRANT SELECT ON public.user_filter_presets TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_filters') THEN
    GRANT SELECT ON public.saved_filters TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views') THEN
    GRANT SELECT ON public.product_views TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_reviews') THEN
    GRANT SELECT ON public.product_reviews TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_comments') THEN
    GRANT SELECT ON public.quote_comments TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_templates') THEN
    GRANT SELECT ON public.notification_templates TO authenticated;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    GRANT SELECT ON public.mockup_approval_links TO anon, authenticated;
  END IF;
END $$;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT
  'RLS aplicado de forma defensiva em todas as tabelas restantes!' as message,
  'Todas as policies verificam existência das tabelas antes de criar' as status,
  'Todas as policies baseadas em Organizations ou User-scoped' as info;
