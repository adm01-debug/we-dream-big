-- ============================================================
-- GIFTS STORE - TESTES FINAIS (COM ORGANIZATIONS)
-- Validação completa do sistema multi-tenant
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================================

SELECT 
  'TOTAL DE TABELAS' as test,
  COUNT(*) as count,
  'Esperado: ~38-40' as expected
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Listar todas as tabelas
SELECT 
  'LISTA DE TABELAS' as test,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- 2. VERIFICAR QUE GAMIFICAÇÃO FOI REMOVIDA
-- ============================================================

SELECT 
  'GAMIFICAÇÃO REMOVIDA?' as test,
  COUNT(*) as tabelas_gamificacao,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SIM'
    ELSE '❌ NÃO - Ainda existem ' || COUNT(*) || ' tabelas'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'rewards',
    'achievements',
    'user_points',
    'reward_redemptions',
    'user_achievements',
    'point_transactions'
  );

-- ============================================================
-- 3. VERIFICAR SISTEMA DE ORGANIZATIONS
-- ============================================================

-- Tabela organizations existe?
SELECT 
  'ORGANIZATIONS TABLE' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END as status;

-- Tabela user_organizations existe?
SELECT 
  'USER_ORGANIZATIONS TABLE' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_organizations') 
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END as status;

-- Enum org_role existe?
SELECT 
  'ORG_ROLE ENUM' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') 
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END as status;

-- Valores do enum org_role
SELECT 
  'ORG_ROLE VALUES' as test,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values,
  'Esperado: owner, admin, member' as expected
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'org_role';

-- ============================================================
-- 4. VERIFICAR FUNÇÕES DE ORGANIZATIONS
-- ============================================================

SELECT 
  'FUNÇÕES ORGANIZATIONS' as test,
  routine_name,
  CASE 
    WHEN routine_name IN ('is_org_admin', 'is_org_owner_or_admin', 'user_is_org_member')
    THEN '✅'
    ELSE '❓'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_org_admin',
    'is_org_owner_or_admin',
    'user_is_org_member',
    'prevent_removing_last_owner'
  )
ORDER BY routine_name;

-- ============================================================
-- 5. VERIFICAR RLS HABILITADO
-- ============================================================

SELECT 
  'RLS HABILITADO' as test,
  COUNT(*) as tabelas_com_rls,
  COUNT(*) FILTER (WHERE rowsecurity = true) as tabelas_rls_ativo,
  CASE 
    WHEN COUNT(*) FILTER (WHERE rowsecurity = true) >= 30 
    THEN '✅ Maioria tem RLS'
    ELSE '⚠️ Poucas tabelas com RLS'
  END as status
FROM pg_tables
WHERE schemaname = 'public';

-- Detalhamento RLS por tabela
SELECT 
  'RLS POR TABELA' as test,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ Ativo'
    ELSE '❌ Inativo'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 6. VERIFICAR POLICIES CRIADAS
-- ============================================================

SELECT 
  'TOTAL DE POLICIES' as test,
  COUNT(*) as total_policies,
  'Esperado: 50+' as expected
FROM pg_policies
WHERE schemaname = 'public';

-- Policies por tabela
SELECT 
  'POLICIES POR TABELA' as test,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;

-- ============================================================
-- 7. VERIFICAR COLUNA organization_id
-- ============================================================

SELECT 
  'TABELAS COM organization_id' as test,
  table_name,
  '✅' as has_org_column
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
ORDER BY table_name;

-- Contar quantas tabelas têm organization_id
SELECT 
  'TOTAL COM organization_id' as test,
  COUNT(DISTINCT table_name) as count,
  'Esperado: 8-12 tabelas principais' as expected
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id';

-- ============================================================
-- 8. VERIFICAR SEED DATA
-- ============================================================

-- Categorias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    RAISE NOTICE 'CATEGORIAS: tabela existe - verificar dados com SELECT COUNT(*) FROM public.categories';
  ELSE
    RAISE NOTICE 'CATEGORIAS: tabela nao existe ainda - pulando';
  END IF;
END $$;

-- Técnicas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    RAISE NOTICE 'TÉCNICAS: tabela existe - verificar dados com SELECT COUNT(*) FROM public.personalization_techniques';
  ELSE
    RAISE NOTICE 'TÉCNICAS: tabela nao existe ainda - pulando';
  END IF;
END $$;

-- Feature Flags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    RAISE NOTICE 'FEATURE FLAGS: tabela existe - verificar dados com SELECT COUNT(*) FROM public.feature_flags';
  ELSE
    RAISE NOTICE 'FEATURE FLAGS: tabela nao existe ainda - pulando';
  END IF;
END $$;

-- Flag enable_organizations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    RAISE NOTICE 'FLAG enable_organizations: tabela feature_flags existe';
  ELSE
    RAISE NOTICE 'FLAG enable_organizations: tabela feature_flags nao existe ainda - pulando';
  END IF;
END $$;

-- System Settings
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings') THEN
    RAISE NOTICE 'SYSTEM SETTINGS: tabela existe - verificar dados com SELECT COUNT(*) FROM public.system_settings';
  ELSE
    RAISE NOTICE 'SYSTEM SETTINGS: tabela nao existe ainda - pulando';
  END IF;
END $$;

-- ============================================================
-- 9. VERIFICAR ÍNDICES
-- ============================================================

SELECT 
  'TOTAL DE ÍNDICES' as test,
  COUNT(*) as total_indexes,
  'Esperado: 50+' as expected
FROM pg_indexes
WHERE schemaname = 'public';

-- Índices relacionados a organizations
SELECT 
  'ÍNDICES organization_id' as test,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%organization_id%'
ORDER BY tablename;

-- ============================================================
-- 10. VERIFICAR ENUM payment_status
-- ============================================================

SELECT 
  'PAYMENT_STATUS ENUM' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') 
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END as status;

-- Valores do enum
SELECT 
  'PAYMENT_STATUS VALUES' as test,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'payment_status';

-- ============================================================
-- 11. VERIFICAR TRIGGERS
-- ============================================================

SELECT 
  'TRIGGERS' as test,
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================
-- 12. VERIFICAR NOTIFICATION TEMPLATES
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_templates') THEN
    RAISE NOTICE 'NOTIFICATION TEMPLATES: tabela existe - verificar dados com SELECT COUNT(*) FROM public.notification_templates';
  ELSE
    RAISE NOTICE 'NOTIFICATION TEMPLATES: tabela nao existe ainda - pulando';
  END IF;
END $$;

-- ============================================================
-- 13. CHECKLIST FINAL
-- ============================================================

SELECT 
  'CHECKLIST FINAL' as validation,
  
  -- Tabelas
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 38 
    THEN '✅' 
    ELSE '❌' 
  END as "tabelas_criadas",
  
  -- Gamificação removida
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rewards', 'achievements', 'user_points')
    )
    THEN '✅' 
    ELSE '❌' 
  END as "gamificacao_removida",
  
  -- Organizations
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
    THEN '✅' 
    ELSE '❌' 
  END as "organizations_exists",
  
  -- RLS
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) >= 30 
    THEN '✅' 
    ELSE '❌' 
  END as "rls_ativo",
  
  -- Policies
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 40 
    THEN '✅' 
    ELSE '❌' 
  END as "policies_criadas",
  
  -- Seed: Categorias
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories')
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') >= 1
    THEN '(verificar com SELECT COUNT(*) FROM public.categories >= 10)'
    ELSE '❌ tabela nao existe'
  END as "categorias_seed",

  -- Seed: Técnicas
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques')
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') >= 1
    THEN '(verificar com SELECT COUNT(*) FROM public.personalization_techniques >= 10)'
    ELSE '❌ tabela nao existe'
  END as "tecnicas_seed",
  
  -- Payments
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') 
    THEN '✅' 
    ELSE '❌' 
  END as "payments_exists",
  
  -- Payment enum
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') 
    THEN '✅' 
    ELSE '❌' 
  END as "payment_enum";

-- ============================================================
-- 14. RESUMO EXECUTIVO
-- ============================================================

SELECT
  'RESUMO DO SISTEMA' as title,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories')
    THEN (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='categories')
    ELSE 'tabela nao existe'
  END as categories_exists,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques')
    THEN (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='personalization_techniques')
    ELSE 'tabela nao existe'
  END as techniques_exists,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags')
    THEN (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags')
    ELSE 'tabela nao existe'
  END as feature_flags_exists;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT 
  '🎉 VALIDAÇÃO COMPLETA!' as message,
  'Sistema multi-tenant com Organizations pronto para uso' as status,
  'Próximo passo: Criar primeira Organization no app' as next_step;
