-- ═══════════════════════════════════════════════════════════════════
-- D.7 Fase B.2.1 — DROP das 3 funções órfãs
-- ═══════════════════════════════════════════════════════════════════
-- Pré-requisito: 01_refactor_functions.sql aplicado (remove referências
--                de validate_status_fields e dispatch_quote_webhook_event)
--
-- Aplicado em PROD: 2026-05-12
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

REVOKE ALL ON FUNCTION public.record_public_token_failure(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_quote_token_by_value(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_quote_response(text, text, text) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.record_public_token_failure(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_quote_token_by_value(text);
DROP FUNCTION IF EXISTS public.submit_quote_response(text, text, text);

COMMIT;
