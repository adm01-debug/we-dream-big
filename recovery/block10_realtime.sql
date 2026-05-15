-- =====================================================================
-- BLOCO 10 — REALTIME (publication supabase_realtime)
-- =====================================================================
-- Inspeção:
--   SELECT * FROM pg_publication WHERE pubname='supabase_realtime';
--   -> 1 publication: puballtables=false, insert/update/delete/truncate=true
--
--   SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime';
--   -> 0 linhas (NENHUMA tabela publicada)
--
-- Decisão de arquitetura: o projeto usa POLLING (30s) em vez de Realtime
-- para notificações (ver mem://features/notifications/workspace-notification-service-v2).
-- A publication existe (criada automaticamente pelo Supabase) mas está vazia.
--
-- Em ambiente Supabase a publication `supabase_realtime` JÁ EXISTE por padrão
-- — o CREATE abaixo é idempotente para ambientes "from scratch".
-- =====================================================================

-- Cria a publication se não existir (Supabase já cria por padrão).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Nenhuma tabela está publicada no Realtime atualmente.
-- Para habilitar Realtime em uma tabela específica, use:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.<nome_da_tabela>;
--   ALTER TABLE public.<nome_da_tabela> REPLICA IDENTITY FULL;  -- opcional, p/ payload completo
