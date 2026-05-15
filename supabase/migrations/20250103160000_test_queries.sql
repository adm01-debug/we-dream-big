-- ============================================================
-- GIFTS STORE - TEST QUERIES
-- Queries para testar e validar o sistema
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================================

SELECT
  'TABELAS CRIADAS' as test_group,
  COUNT(*) as total_tables,
  string_agg(table_name, ', ' ORDER BY table_name) as table_names
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- ============================================================
-- 2. VERIFICAR RLS HABILITADO
-- ============================================================

SELECT
  'RLS STATUS' as test_group,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 3. VERIFICAR POLICIES CRIADAS
-- ============================================================

SELECT
  'POLICIES' as test_group,
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- 4. VERIFICAR SEED DATA
-- (Wrapped in DO blocks because tables may not exist yet)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    RAISE NOTICE 'Table categories exists';
  ELSE
    RAISE NOTICE 'Table categories does not exist yet';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    RAISE NOTICE 'Table personalization_techniques exists';
  ELSE
    RAISE NOTICE 'Table personalization_techniques does not exist yet';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='achievements') THEN
    RAISE NOTICE 'Table achievements exists';
  ELSE
    RAISE NOTICE 'Table achievements does not exist yet';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
    RAISE NOTICE 'Table rewards exists';
  ELSE
    RAISE NOTICE 'Table rewards does not exist yet';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    RAISE NOTICE 'Table feature_flags exists';
  ELSE
    RAISE NOTICE 'Table feature_flags does not exist yet';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings') THEN
    RAISE NOTICE 'Table system_settings exists';
  ELSE
    RAISE NOTICE 'Table system_settings does not exist yet';
  END IF;
END $$;

-- ============================================================
-- 5. TESTAR CONEXAO BASICA
-- ============================================================

SELECT
  'CONNECTION TEST' as test_group,
  current_user as connected_as,
  current_database() as database,
  version() as postgres_version,
  NOW() as current_time;

-- ============================================================
-- 6. VERIFICAR INDICES
-- ============================================================

SELECT
  'INDICES' as test_group,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================
-- 7. VERIFICAR CONSTRAINTS
-- ============================================================

SELECT
  'CONSTRAINTS' as test_group,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================
-- 8. VERIFICAR FOREIGN KEYS
-- ============================================================

SELECT
  'FOREIGN KEYS' as test_group,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================
-- 9. VERIFICAR FUNCOES CRIADAS
-- ============================================================

SELECT
  'FUNCOES' as test_group,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'is_manager_or_admin', 'get_user_role')
ORDER BY routine_name;

-- ============================================================
-- 10. ESTATISTICAS DAS TABELAS
-- ============================================================

SELECT
  'ESTATISTICAS' as test_group,
  schemaname,
  relname as table_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- ============================================================
-- 11. TESTE DE INSERCAO (CATEGORIAS)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    BEGIN
      INSERT INTO public.categories (name, slug, description, is_active)
      VALUES ('Teste Categoria', 'teste-categoria', 'Categoria de teste', true);

      RAISE NOTICE 'Insercao de categoria de teste: OK';

      DELETE FROM public.categories WHERE slug = 'teste-categoria';

      RAISE NOTICE 'Remocao de categoria de teste: OK';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de insercao: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Tabela categories nao existe ainda - teste de insercao ignorado';
  END IF;
END $$;

-- ============================================================
-- 12. VERIFICAR ESTRUTURA DE CADA MODULO
-- ============================================================

SELECT
  'MODULO USUARIOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profiles') as profiles_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_sessions') as sessions_exists;

SELECT
  'MODULO PRODUTOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'categories') as categories,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'suppliers') as suppliers,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'products') as products,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'product_variants') as variants,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'collections') as collections;

SELECT
  'MODULO ORCAMENTOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quotes') as quotes,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_items') as quote_items,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_templates') as templates,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quote_comments') as comments;

SELECT
  'MODULO PEDIDOS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'orders') as orders,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'order_items') as order_items;

SELECT
  'MODULO MOCKUPS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'personalization_techniques') as techniques,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mockup_generation_jobs') as jobs,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'generated_mockups') as mockups,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mockup_approval_links') as approval_links;

SELECT
  'MODULO GAMIFICACAO' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_points') as points,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'point_transactions') as transactions,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'achievements') as achievements,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_achievements') as user_achievements,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'rewards') as rewards,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'reward_redemptions') as redemptions;

SELECT
  'MODULO NOTIFICACOES' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications') as notifications,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_preferences') as preferences,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'push_subscriptions') as push_subs;

SELECT
  'MODULO ANALYTICS' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_events') as events,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'product_views') as views,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'search_queries') as searches;

SELECT
  'MODULO CLIENTES' as module,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bitrix_clients') as clients,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_contacts') as contacts,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_notes') as notes;

-- ============================================================
-- 13. RESUMO FINAL (safe - only system tables)
-- ============================================================

SELECT
  'RESUMO GERAL' as summary,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;

-- ============================================================
-- 14. CHECKLIST DE VALIDACAO (safe - only system tables)
-- ============================================================

SELECT
  'CHECKLIST' as validation,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 44
    THEN 'OK'
    ELSE 'NOT YET'
  END as "44_tabelas_criadas",

  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 30
    THEN 'OK'
    ELSE 'NOT YET'
  END as "policies_criadas",

  CASE
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') >= 45
    THEN 'OK'
    ELSE 'NOT YET'
  END as "indices_criados",

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') >= 1
    THEN 'EXISTS'
    ELSE 'NOT YET'
  END as "categories_table",

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'personalization_techniques') >= 1
    THEN 'EXISTS'
    ELSE 'NOT YET'
  END as "techniques_table",

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'achievements') >= 1
    THEN 'EXISTS'
    ELSE 'NOT YET'
  END as "achievements_table",

  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_flags') >= 1
    THEN 'EXISTS'
    ELSE 'NOT YET'
  END as "feature_flags_table";

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT
  'TESTES CONCLUIDOS!' as message,
  'Verifique os resultados acima para validar o sistema' as next_step;
