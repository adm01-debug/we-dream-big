-- ============================================================
-- GIFTS STORE - REMOVER GAMIFICAÇÃO
-- Remove todas as tabelas e dependências de gamificação
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- REMOVER TABELAS DE GAMIFICAÇÃO (EM ORDEM DE DEPENDÊNCIA)
-- ============================================================

-- 1. Remover tabelas dependentes primeiro
DROP TABLE IF EXISTS public.reward_redemptions CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.point_transactions CASCADE;

-- 2. Remover tabelas principais
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.user_points CASCADE;

-- ============================================================
-- REMOVER FEATURE FLAG DE GAMIFICAÇÃO (SE EXISTIR)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feature_flags') THEN
    DELETE FROM public.feature_flags WHERE flag_name = 'enable_gamification';
  END IF;
END $$;

-- ============================================================
-- REMOVER CONFIGURAÇÕES DE PONTOS (SE EXISTIREM)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_settings') THEN
    DELETE FROM public.system_settings WHERE setting_key IN ('points_per_sale','points_per_quote','points_per_mockup');
  END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

-- Listar tabelas restantes
SELECT 
  'TABELAS RESTANTES' as info,
  COUNT(*) as total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Verificar se gamificação foi removida
SELECT 
  'GAMIFICAÇÃO REMOVIDA' as info,
  COUNT(*) as tabelas_gamificacao
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
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 
  '✅ Gamificação removida com sucesso!' as message,
  'Sistema agora tem foco em Organizations multi-tenant' as info;
