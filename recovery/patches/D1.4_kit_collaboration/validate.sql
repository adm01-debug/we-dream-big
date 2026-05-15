-- ═══════════════════════════════════════════════════════════════════
-- VALIDATE — D1.4_kit_collaboration
-- Rodar APÓS patch.sql. Todas as verificações devem retornar TRUE.
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'D1.4_kit_collaboration' AS patch,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_collaborators') AS has_kit_collaborators,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_comments') AS has_kit_comments,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_share_tokens') AS has_kit_share_tokens,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_variants') AS has_kit_variants,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_kit_collaborator') AS has_fn_is_kit_collaborator,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_kit_owner') AS has_fn_is_kit_owner;

-- Contadores
SELECT 
  'D1.4_kit_collaboration_counters' AS check_,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='kit_collaborators') AS cols_kit_collaborators,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='kit_comments') AS cols_kit_comments,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='kit_share_tokens') AS cols_kit_share_tokens,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='kit_variants') AS cols_kit_variants;

-- Policies criadas?
SELECT tablename, count(*) AS policies_count
FROM pg_policies WHERE schemaname='public' AND tablename IN ('kit_collaborators', 'kit_comments', 'kit_share_tokens', 'kit_variants')
GROUP BY tablename;

-- Indexes criados?
SELECT tablename, count(*) AS indexes_count
FROM pg_indexes WHERE schemaname='public' AND tablename IN ('kit_collaborators', 'kit_comments', 'kit_share_tokens', 'kit_variants')
GROUP BY tablename;

-- Functions: callable como RPC?
SELECT proname, 
  CASE WHEN provolatile = 'i' THEN 'IMMUTABLE'
       WHEN provolatile = 's' THEN 'STABLE'
       WHEN provolatile = 'v' THEN 'VOLATILE' END AS volatility,
  prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN ('is_kit_collaborator', 'is_kit_owner')
ORDER BY proname;
