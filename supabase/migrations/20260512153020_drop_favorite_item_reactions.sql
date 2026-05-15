-- ============================================================================
-- DROP: favorite_item_reactions
-- ============================================================================
-- Contexto: tabela de reactions emoji em listas públicas de favoritos.
-- Feature descontinuada em 2026-05-07 (ver docs/AUDITORIA_2026-05-07.md F1-6.6).
-- A edge function `favorites-public-react` já foi removida na mesma data.
-- Tabela com 0 rows em 2026-05-12. Sem FKs apontando para ela.
--
-- Esta migration encerra o ciclo de limpeza, removendo a tabela órfã.
-- Tarefa #2 do redeploy Promo_Gifts (2026-05-12).
-- ============================================================================

DROP TABLE IF EXISTS public.favorite_item_reactions CASCADE;

-- Sanity check (cria erro se algo ainda referencia a tabela)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'favorite_item_reactions'
  ) THEN
    RAISE EXCEPTION 'favorite_item_reactions still exists after DROP';
  END IF;
END $$;
