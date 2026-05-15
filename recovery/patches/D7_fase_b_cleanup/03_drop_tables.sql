-- ═══════════════════════════════════════════════════════════════════
-- D.7 Fase B.2.2 — DROP das 2 tables vazias
-- ═══════════════════════════════════════════════════════════════════
-- Pré-requisito: 01 + 02 aplicados. Tables foram auditadas:
--   - kit_share_tokens: 0 rows, 0 FKs apontando, 0 triggers, 0 policies externas
--   - quote_approval_tokens: idem
--
-- Aplicado em PROD: 2026-05-12
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS public.kit_share_tokens CASCADE;
DROP TABLE IF EXISTS public.quote_approval_tokens CASCADE;

COMMIT;
