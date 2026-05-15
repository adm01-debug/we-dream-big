-- BACKUP — D.2.2 Outbound Webhooks
-- Pré-requisito: rodar ANTES do patch.sql
-- O patch cria 2 tables novas (outbound_webhooks, webhook_deliveries).
-- Como NENHUMA das 2 tabelas existia previamente, backup é trivial.

BEGIN;

-- Verificação preventiva: confirmar que tabelas NÃO existem
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('outbound_webhooks','webhook_deliveries');
  IF v_count > 0 THEN
    RAISE WARNING 'Tabelas já existem (%/2) — verifique antes de aplicar patch', v_count;
  END IF;
END$$;

COMMIT;

-- Não há dados para backup (tabelas novas)
SELECT 'no_backup_needed' AS status, 'tabelas são novas' AS reason;
