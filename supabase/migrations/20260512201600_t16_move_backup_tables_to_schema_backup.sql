-- ============================================================
--  T16 — Move 17 tabelas `_backup_*` de `public` para schema `backup`
--  (redeploy 2026-05 Fase 1 - bloqueador B4)
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- A migration aplicada via MCP `apply_migration` gravou só um SUMMARY em
-- `supabase_migrations.schema_migrations` (linha `ALTER TABLE public._backup_*
-- SET SCHEMA backup; (17 tabelas)` que é SQL inválido). Este arquivo é a
-- reconstrução fiel a partir da lista real de tabelas que hoje residem em
-- `schema backup` (validado por `pg_tables WHERE schemaname='backup'`).
--
-- Objetivo: zerar o advisor `rls_disabled_in_public` para tabelas `_backup_*`
-- que ficaram fora do PostgREST/REST API ao mudar de schema. RLS deny-all
-- não é necessário pq o schema `backup` em si não está exposto.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS backup;

-- Move 17 tabelas (idempotente — `IF EXISTS` evita falha em reruns)
DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    '_backup_20260425_tabela_preco_gravacao_oficial_faixa',
    '_backup_20260425_tecnicas_gravacao',
    '_backup_collection_products_b2b_20260511',
    '_backup_collections_b2b_20260511',
    '_backup_collections_policies_b2b_20260511',
    '_backup_functions_d12',
    '_backup_guardachuva_setup_20260425',
    '_backup_plaquinha_sugestao_20260425',
    '_backup_silk_ajustes_20260426',
    '_backup_storage_buckets_20260511_d11',
    '_backup_storage_policies_20260511_d11',
    '_backup_system_settings_legacy_20260511',
    '_backup_unif_funcoes_20260425',
    '_backup_unif_funcoes_f3_20260425',
    '_backup_unif_limpeza_fatmin_20260425',
    '_backup_unif_setup_fatmin_20260425',
    '_backup_unif_setup_fatmin_faixa_20260425'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = v_tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA backup;', v_tbl);
      RAISE NOTICE 'Moved public.% → backup.%', v_tbl, v_tbl;
    ELSE
      RAISE NOTICE 'Skipped (not in public): %', v_tbl;
    END IF;
  END LOOP;
END $$;

-- Defesa em profundidade: schema `backup` não exposto via PostgREST.
REVOKE ALL ON SCHEMA backup FROM anon, authenticated, PUBLIC;
GRANT USAGE ON SCHEMA backup TO postgres, service_role;
