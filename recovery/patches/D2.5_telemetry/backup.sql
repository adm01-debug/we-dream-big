-- BACKUP — D.2.5 Telemetry & Monitoring
-- Pré-requisito: rodar ANTES do patch.sql
-- O patch cria 3 tables base (app_vitals, query_telemetry, webhook_delivery_metrics)
-- + 6 RPCs. As tabelas foram expandidas mid-execução (Decision 006).

BEGIN;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'app_vitals','query_telemetry','webhook_delivery_metrics'
  );
  IF v_count > 0 THEN
    RAISE WARNING 'Tables telemetry já existem (%/3) — verifique antes de aplicar patch', v_count;
  END IF;
END$$;

COMMIT;

SELECT 'no_backup_needed' AS status, 'tabelas são novas' AS reason;
