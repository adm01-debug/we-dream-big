-- ============================================================
-- GIFTS STORE - RLS COM ORGANIZATIONS (MULTI-TENANT)
-- Aplica Row Level Security baseado em Organizations
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- PARTE 1: ADICIONAR organization_id NAS TABELAS PRINCIPAIS
-- (só se organizations existir)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='categories' AND indexname='idx_categories_org') THEN
    CREATE INDEX idx_categories_org ON public.categories(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='suppliers' AND indexname='idx_suppliers_org') THEN
    CREATE INDEX idx_suppliers_org ON public.suppliers(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='products' AND indexname='idx_products_org') THEN
    CREATE INDEX idx_products_org ON public.products(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='quotes' AND indexname='idx_quotes_org') THEN
    CREATE INDEX idx_quotes_org ON public.quotes(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='orders' AND indexname='idx_orders_org') THEN
    CREATE INDEX idx_orders_org ON public.orders(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients') THEN
    ALTER TABLE public.bitrix_clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bitrix_clients' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='bitrix_clients' AND indexname='idx_bitrix_clients_org') THEN
    CREATE INDEX idx_bitrix_clients_org ON public.bitrix_clients(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    ALTER TABLE public.mockup_generation_jobs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_generation_jobs' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND indexname='idx_mockup_jobs_org') THEN
    CREATE INDEX idx_mockup_jobs_org ON public.mockup_generation_jobs(organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collections') THEN
    ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='collections' AND indexname='idx_collections_org') THEN
    CREATE INDEX idx_collections_org ON public.collections(organization_id);
  END IF;
END $$;

-- ============================================================
-- PARTE 2: FUNÇÃO HELPER - Verificar se user pertence à org
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- PARTE 3: APLICAR RLS EM TODAS AS TABELAS (se existirem)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_variants') THEN
    ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items') THEN
    ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients') THEN
    ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collections') THEN
    ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_products') THEN
    ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings') THEN
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- PARTE 4: POLICIES - CATEGORIES (só se organization_id existir)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='org_members_view_categories') THEN
    CREATE POLICY "org_members_view_categories" ON public.categories FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='org_admins_create_categories') THEN
    CREATE POLICY "org_admins_create_categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='org_admins_update_categories') THEN
    CREATE POLICY "org_admins_update_categories" ON public.categories FOR UPDATE TO authenticated USING (public.is_org_owner_or_admin(organization_id)) WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='org_admins_delete_categories') THEN
    CREATE POLICY "org_admins_delete_categories" ON public.categories FOR DELETE TO authenticated USING (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 5: POLICIES - SUPPLIERS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='org_members_view_suppliers') THEN
    CREATE POLICY "org_members_view_suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='org_admins_manage_suppliers') THEN
    CREATE POLICY "org_admins_manage_suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_org_owner_or_admin(organization_id)) WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 6: POLICIES - PRODUCTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='org_members_view_products') THEN
    CREATE POLICY "org_members_view_products" ON public.products FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='org_admins_manage_products') THEN
    CREATE POLICY "org_admins_manage_products" ON public.products FOR ALL TO authenticated USING (public.is_org_owner_or_admin(organization_id)) WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 7: POLICIES - PRODUCT_VARIANTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_variants')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='org_members_view_variants') THEN
    CREATE POLICY "org_members_view_variants" ON public.product_variants FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND public.user_is_org_member(organization_id))
    );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_variants')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='org_admins_manage_variants') THEN
    CREATE POLICY "org_admins_manage_variants" ON public.product_variants FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND public.is_org_owner_or_admin(organization_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND public.is_org_owner_or_admin(organization_id)));
  END IF;
END $$;

-- ============================================================
-- PARTE 8: POLICIES - QUOTES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='org_members_view_quotes') THEN
    CREATE POLICY "org_members_view_quotes" ON public.quotes FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='org_members_create_quotes') THEN
    CREATE POLICY "org_members_create_quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='org_members_update_own_quotes') THEN
    CREATE POLICY "org_members_update_own_quotes" ON public.quotes FOR UPDATE TO authenticated
    USING (public.user_is_org_member(organization_id) AND (created_by = auth.uid() OR public.is_org_admin(organization_id)));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='org_admins_delete_quotes') THEN
    CREATE POLICY "org_admins_delete_quotes" ON public.quotes FOR DELETE TO authenticated USING (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 9: POLICIES - QUOTE_ITEMS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_items' AND policyname='org_members_view_quote_items') THEN
    CREATE POLICY "org_members_view_quote_items" ON public.quote_items FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_items.quote_id AND public.user_is_org_member(organization_id))
    );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_items' AND policyname='org_members_manage_quote_items') THEN
    CREATE POLICY "org_members_manage_quote_items" ON public.quote_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_items.quote_id AND (created_by = auth.uid() OR public.is_org_admin(organization_id))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_items.quote_id AND public.user_is_org_member(organization_id)));
  END IF;
END $$;

-- ============================================================
-- PARTE 10: POLICIES - ORDERS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='org_members_view_orders') THEN
    CREATE POLICY "org_members_view_orders" ON public.orders FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='org_members_create_orders') THEN
    CREATE POLICY "org_members_create_orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='org_members_update_own_orders') THEN
    CREATE POLICY "org_members_update_own_orders" ON public.orders FOR UPDATE TO authenticated
    USING (public.user_is_org_member(organization_id) AND (created_by = auth.uid() OR public.is_org_admin(organization_id)));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='org_admins_delete_orders') THEN
    CREATE POLICY "org_admins_delete_orders" ON public.orders FOR DELETE TO authenticated USING (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 11: POLICIES - ORDER_ITEMS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='org_members_view_order_items') THEN
    CREATE POLICY "org_members_view_order_items" ON public.order_items FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND public.user_is_org_member(organization_id))
    );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='org_members_manage_order_items') THEN
    CREATE POLICY "org_members_manage_order_items" ON public.order_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (created_by = auth.uid() OR public.is_org_admin(organization_id))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND public.user_is_org_member(organization_id)));
  END IF;
END $$;

-- ============================================================
-- PARTE 12: POLICIES - PAYMENTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='org_members_view_payments') THEN
    CREATE POLICY "org_members_view_payments" ON public.payments FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.orders WHERE id = payments.order_id AND public.user_is_org_member(organization_id))
    );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='organization_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='org_admins_manage_payments') THEN
    CREATE POLICY "org_admins_manage_payments" ON public.payments FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.orders WHERE id = payments.order_id AND public.is_org_admin(organization_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = payments.order_id AND public.user_is_org_member(organization_id)));
  END IF;
END $$;

-- ============================================================
-- PARTE 13: POLICIES - BITRIX_CLIENTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bitrix_clients' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bitrix_clients' AND policyname='org_members_view_clients') THEN
    CREATE POLICY "org_members_view_clients" ON public.bitrix_clients FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bitrix_clients' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bitrix_clients' AND policyname='org_admins_manage_clients') THEN
    CREATE POLICY "org_admins_manage_clients" ON public.bitrix_clients FOR ALL TO authenticated USING (public.is_org_owner_or_admin(organization_id)) WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 14: POLICIES - MOCKUPS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_generation_jobs' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='org_members_view_mockup_jobs') THEN
    CREATE POLICY "org_members_view_mockup_jobs" ON public.mockup_generation_jobs FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_generation_jobs' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='org_members_create_mockup_jobs') THEN
    CREATE POLICY "org_members_create_mockup_jobs" ON public.mockup_generation_jobs FOR INSERT TO authenticated WITH CHECK (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_generation_jobs' AND column_name='organization_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='org_members_view_generated_mockups') THEN
    CREATE POLICY "org_members_view_generated_mockups" ON public.generated_mockups FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.mockup_generation_jobs WHERE id = generated_mockups.job_id AND public.user_is_org_member(organization_id))
    );
  END IF;
END $$;

-- ============================================================
-- PARTE 15: POLICIES - COLLECTIONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections' AND policyname='org_members_view_collections') THEN
    CREATE POLICY "org_members_view_collections" ON public.collections FOR SELECT TO authenticated USING (public.user_is_org_member(organization_id));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='organization_id')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections' AND policyname='org_admins_manage_collections') THEN
    CREATE POLICY "org_admins_manage_collections" ON public.collections FOR ALL TO authenticated USING (public.is_org_owner_or_admin(organization_id)) WITH CHECK (public.is_org_owner_or_admin(organization_id));
  END IF;
END $$;

-- ============================================================
-- PARTE 16: POLICIES - PERSONALIZATION_TECHNIQUES (GLOBAL)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='anyone_view_techniques') THEN
    CREATE POLICY "anyone_view_techniques" ON public.personalization_techniques FOR SELECT TO authenticated USING (is_active = true);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='admins_manage_techniques') THEN
    CREATE POLICY "admins_manage_techniques" ON public.personalization_techniques FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
  END IF;
END $$;

-- ============================================================
-- PARTE 17: POLICIES - NOTIFICATIONS (USER-SCOPED)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='users_view_own_notifications') THEN
    CREATE POLICY "users_view_own_notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='users_update_own_notifications') THEN
    CREATE POLICY "users_update_own_notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- PARTE 18: POLICIES - SYSTEM TABLES (ADMIN ONLY)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feature_flags' AND policyname='admins_view_feature_flags') THEN
    CREATE POLICY "admins_view_feature_flags" ON public.feature_flags FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_settings' AND policyname='admins_manage_system_settings') THEN
    CREATE POLICY "admins_manage_system_settings" ON public.system_settings FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
  END IF;
END $$;

-- ============================================================
-- PARTE 19: GRANTS (só se as tabelas existirem)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    GRANT SELECT ON public.categories TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    GRANT SELECT ON public.suppliers TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    GRANT SELECT ON public.products TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    GRANT SELECT ON public.quotes TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    GRANT SELECT ON public.orders TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    GRANT SELECT ON public.payments TO authenticated;
  END IF;
END $$;
