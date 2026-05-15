-- ROLLBACK — D.2.2 Outbound Webhooks
-- Desfaz integralmente o patch.

BEGIN;

DROP TABLE IF EXISTS public.webhook_deliveries CASCADE;
DROP TABLE IF EXISTS public.outbound_webhooks CASCADE;

COMMIT;

-- Validação
SELECT
  'D.2.2 rollback complete' AS status,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN ('outbound_webhooks','webhook_deliveries')) AS remaining,
  CASE
    WHEN (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN ('outbound_webhooks','webhook_deliveries')) = 0
    THEN '✅ rollback ok' ELSE '❌ parcial' END AS verdict;
