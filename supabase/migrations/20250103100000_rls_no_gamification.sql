-- ============================================================
-- GIFTS STORE - ROW LEVEL SECURITY (RLS) POLICIES
-- Configuração completa de segurança para todas as tabelas
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é manager ou admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'manager')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para pegar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PROFILES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users podem ver e editar apenas seu próprio perfil
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile') THEN
      CREATE POLICY "Users can view own profile"
        ON public.profiles FOR SELECT
        USING (auth.uid() = id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile') THEN
      CREATE POLICY "Users can update own profile"
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id);
    END IF;
  END IF;
END $$;

-- Admins veem todos os perfis
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can view all profiles') THEN
      CREATE POLICY "Admins can view all profiles"
        ON public.profiles FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can update all profiles') THEN
      CREATE POLICY "Admins can update all profiles"
        ON public.profiles FOR UPDATE
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- Managers veem perfis do seu departamento
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Managers can view department profiles') THEN
      CREATE POLICY "Managers can view department profiles"
        ON public.profiles FOR SELECT
        USING (
          public.is_manager_or_admin() OR
          department = (SELECT department FROM public.profiles WHERE id = auth.uid())
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- 2. PRODUCTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Todos podem ver produtos ativos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Anyone can view active products')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_active') THEN
      CREATE POLICY "Anyone can view active products"
        ON public.products FOR SELECT
        USING (is_active = true);
    END IF;
  END IF;
END $$;

-- Admins e managers podem ver todos os produtos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Admins can view all products') THEN
      CREATE POLICY "Admins can view all products"
        ON public.products FOR SELECT
        USING (public.is_manager_or_admin());
    END IF;
  END IF;
END $$;

-- Apenas admins podem criar/editar produtos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Admins can insert products') THEN
      CREATE POLICY "Admins can insert products"
        ON public.products FOR INSERT
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Admins can update products') THEN
      CREATE POLICY "Admins can update products"
        ON public.products FOR UPDATE
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Admins can delete products') THEN
      CREATE POLICY "Admins can delete products"
        ON public.products FOR DELETE
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 3. CATEGORIES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Todos podem ver categorias ativas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Anyone can view active categories')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='is_active') THEN
      CREATE POLICY "Anyone can view active categories"
        ON public.categories FOR SELECT
        USING (is_active = true);
    END IF;
  END IF;
END $$;

-- Admins gerenciam categorias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Admins can manage categories') THEN
      CREATE POLICY "Admins can manage categories"
        ON public.categories FOR ALL
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. SUPPLIERS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Authenticated users podem ver fornecedores ativos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='Authenticated users can view active suppliers')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='is_active') THEN
      CREATE POLICY "Authenticated users can view active suppliers"
        ON public.suppliers FOR SELECT
        USING (is_active = true AND auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- Admins gerenciam fornecedores
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='Admins can manage suppliers') THEN
      CREATE POLICY "Admins can manage suppliers"
        ON public.suppliers FOR ALL
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 5. QUOTES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users veem orçamentos que criaram ou foram atribuídos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='Users can view own quotes') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='assigned_to') THEN
        CREATE POLICY "Users can view own quotes"
          ON public.quotes FOR SELECT
          USING (
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            public.is_manager_or_admin()
          );
      ELSE
        CREATE POLICY "Users can view own quotes"
          ON public.quotes FOR SELECT
          USING (
            created_by = auth.uid() OR
            public.is_manager_or_admin()
          );
      END IF;
    END IF;
  END IF;
END $$;

-- Users podem criar orçamentos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='Authenticated users can create quotes') THEN
      CREATE POLICY "Authenticated users can create quotes"
        ON public.quotes FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- Users podem editar orçamentos que criaram
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='Users can update own quotes') THEN
      CREATE POLICY "Users can update own quotes"
        ON public.quotes FOR UPDATE
        USING (
          created_by = auth.uid() OR
          public.is_manager_or_admin()
        );
    END IF;
  END IF;
END $$;

-- Apenas admins podem deletar
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='Admins can delete quotes') THEN
      CREATE POLICY "Admins can delete quotes"
        ON public.quotes FOR DELETE
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- Aprovação pública (via token)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotes' AND policyname='Public can view quotes with valid token') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='approval_token') THEN
        CREATE POLICY "Public can view quotes with valid token"
          ON public.quotes FOR SELECT
          USING (approval_token IS NOT NULL);
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 6. QUOTE_ITEMS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items') THEN
    ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Mesma lógica das quotes (via quote_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_items' AND policyname='Users can view own quote items') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='assigned_to') THEN
        CREATE POLICY "Users can view own quote items"
          ON public.quote_items FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.quotes
              WHERE id = quote_id
              AND (
                created_by = auth.uid() OR
                assigned_to = auth.uid() OR
                public.is_manager_or_admin()
              )
            )
          );
      ELSE
        CREATE POLICY "Users can view own quote items"
          ON public.quote_items FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.quotes
              WHERE id = quote_id
              AND (
                created_by = auth.uid() OR
                public.is_manager_or_admin()
              )
            )
          );
      END IF;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quote_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_items' AND policyname='Users can manage own quote items') THEN
      CREATE POLICY "Users can manage own quote items"
        ON public.quote_items FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.quotes
            WHERE id = quote_id
            AND (created_by = auth.uid() OR public.is_manager_or_admin())
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- 7. ORDERS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users veem pedidos que criaram ou foram atribuídos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users can view own orders') THEN
      CREATE POLICY "Users can view own orders"
        ON public.orders FOR SELECT
        USING (
          created_by = auth.uid() OR
          assigned_to = auth.uid() OR
          public.is_manager_or_admin()
        );
    END IF;
  END IF;
END $$;

-- Apenas authenticated podem criar
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Authenticated users can create orders') THEN
      CREATE POLICY "Authenticated users can create orders"
        ON public.orders FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- Users editam seus próprios pedidos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Users can update own orders') THEN
      CREATE POLICY "Users can update own orders"
        ON public.orders FOR UPDATE
        USING (
          created_by = auth.uid() OR
          public.is_manager_or_admin()
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- 8. ORDER_ITEMS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Mesma lógica dos orders
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Users can view own order items') THEN
      CREATE POLICY "Users can view own order items"
        ON public.order_items FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id
            AND (
              created_by = auth.uid() OR
              assigned_to = auth.uid() OR
              public.is_manager_or_admin()
            )
          )
        );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Users can manage own order items') THEN
      CREATE POLICY "Users can manage own order items"
        ON public.order_items FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id
            AND (created_by = auth.uid() OR public.is_manager_or_admin())
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- 9. BITRIX_CLIENTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients') THEN
    ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Authenticated users podem ver clientes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bitrix_clients' AND policyname='Authenticated users can view clients') THEN
      CREATE POLICY "Authenticated users can view clients"
        ON public.bitrix_clients FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- Admins e managers gerenciam clientes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bitrix_clients') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bitrix_clients' AND policyname='Admins can manage clients') THEN
      CREATE POLICY "Admins can manage clients"
        ON public.bitrix_clients FOR ALL
        USING (public.is_manager_or_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 10. MOCKUP_GENERATION_JOBS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users veem seus próprios jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can view own mockup jobs') THEN
      CREATE POLICY "Users can view own mockup jobs"
        ON public.mockup_generation_jobs FOR SELECT
        USING (user_id = auth.uid() OR public.is_manager_or_admin());
    END IF;
  END IF;
END $$;

-- Users criam seus próprios jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Authenticated users can create mockup jobs') THEN
      CREATE POLICY "Authenticated users can create mockup jobs"
        ON public.mockup_generation_jobs FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 11. GENERATED_MOCKUPS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users veem seus próprios mockups
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can view own mockups') THEN
      CREATE POLICY "Users can view own mockups"
        ON public.generated_mockups FOR SELECT
        USING (user_id = auth.uid() OR public.is_manager_or_admin());
    END IF;
  END IF;
END $$;

-- Sistema cria mockups
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='System can create mockups') THEN
      CREATE POLICY "System can create mockups"
        ON public.generated_mockups FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users veem apenas suas notificações
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can view own notifications') THEN
      CREATE POLICY "Users can view own notifications"
        ON public.notifications FOR SELECT
        USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- Users podem marcar como lidas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can update own notifications') THEN
      CREATE POLICY "Users can update own notifications"
        ON public.notifications FOR UPDATE
        USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- Sistema pode criar notificações
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='System can create notifications') THEN
      CREATE POLICY "System can create notifications"
        ON public.notifications FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 14. ANALYTICS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views') THEN
    ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='search_queries') THEN
    ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Qualquer um pode criar eventos de analytics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='Anyone can create analytics events') THEN
      CREATE POLICY "Anyone can create analytics events"
        ON public.analytics_events FOR INSERT
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='Anyone can create product views') THEN
      CREATE POLICY "Anyone can create product views"
        ON public.product_views FOR INSERT
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='search_queries') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='search_queries' AND policyname='Anyone can create search queries') THEN
      CREATE POLICY "Anyone can create search queries"
        ON public.search_queries FOR INSERT
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Apenas admins podem ver analytics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='Admins can view analytics') THEN
      CREATE POLICY "Admins can view analytics"
        ON public.analytics_events FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='Admins can view product views') THEN
      CREATE POLICY "Admins can view product views"
        ON public.product_views FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='search_queries') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='search_queries' AND policyname='Admins can view search queries') THEN
      CREATE POLICY "Admins can view search queries"
        ON public.search_queries FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 15. FAVORITES E COMPARISONS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_favorites') THEN
    ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_comparisons') THEN
    ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Users gerenciam seus próprios favoritos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_favorites') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='Users can manage own favorites') THEN
      CREATE POLICY "Users can manage own favorites"
        ON public.user_favorites FOR ALL
        USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- Users gerenciam suas próprias comparações
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_comparisons') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_comparisons' AND policyname='Users can manage own comparisons') THEN
      CREATE POLICY "Users can manage own comparisons"
        ON public.product_comparisons FOR ALL
        USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 16. SYSTEM TABLES (APENAS ADMINS)
-- ============================================================

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

-- Apenas admins
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feature_flags' AND policyname='Admins can manage feature flags') THEN
      CREATE POLICY "Admins can manage feature flags"
        ON public.feature_flags FOR ALL
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_settings' AND policyname='Admins can manage system settings') THEN
      CREATE POLICY "Admins can manage system settings"
        ON public.system_settings FOR ALL
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_log' AND policyname='Admins can view audit log') THEN
      CREATE POLICY "Admins can view audit log"
        ON public.audit_log FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sync_jobs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sync_jobs' AND policyname='Admins can view sync jobs') THEN
      CREATE POLICY "Admins can view sync jobs"
        ON public.sync_jobs FOR SELECT
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- 17. TABELAS PÚBLICAS (READ-ONLY)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Todos podem ver técnicas ativas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Anyone can view active techniques')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='personalization_techniques' AND column_name='is_active') THEN
      CREATE POLICY "Anyone can view active techniques"
        ON public.personalization_techniques FOR SELECT
        USING (is_active = true);
    END IF;
  END IF;
END $$;

-- Apenas admins editam
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Admins can manage techniques') THEN
      CREATE POLICY "Admins can manage techniques"
        ON public.personalization_techniques FOR ALL
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 'RLS Policies criadas com sucesso! ✅' as message,
       'Todas as tabelas agora têm Row Level Security defensivo' as info;
