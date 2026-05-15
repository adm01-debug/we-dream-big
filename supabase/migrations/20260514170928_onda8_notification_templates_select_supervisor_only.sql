-- Onda 8 (B-3 da auditoria de 10/mai/2026): RLS overly-permissive em notification_templates.
--
-- CONTEXTO:
-- A policy "notification_templates_select" tinha qual = "auth.role() = 'authenticated'",
-- permitindo que QUALQUER usuario autenticado (inclusive vendedor) lesse TODOS os 7
-- templates de sistema (quote_approved, new_order, mockup_ready, etc).
--
-- INVESTIGACAO:
-- 1. Frontend (src/) NAO consulta notification_templates — confirmado via code_search.
-- 2. Edge functions usam service_role que bypassa RLS.
-- 3. Templates sao de sistema (sem coluna user_id/owner) — geralmente lidos so por backend.
-- 4. INSERT/UPDATE/DELETE ja estavam fail-closed (USING false).
--
-- MUDANCA:
-- SELECT agora restrito a is_supervisor_or_above (dev, admin, supervisor, manager).
-- Frontend cliente nao perde acesso (nao lia). Service_role continua bypassando.
--
-- ESTADO DAS OUTRAS 6 TABELAS DA B-3:
-- - audit_log: ja correta (select supervisor_or_above)
-- - analytics_events: ja correta (select self ou coord)
-- - product_views: ja correta (select admin ou seller_id)
-- - search_queries: ja correta (select self ou coord)
-- - quote_templates: ja correta (tudo por created_by)
-- - sync_jobs: tabela NAO existe mais (foi dropada)
-- Migracoes anteriores (t21_fix_rls_always_true_policies, t30_fix_initplan_remaining,
-- t25b_material_groups_rls) ja consertaram as outras 6. Esta migration encerra B-3.
--
-- APLICADA EM PROD em 14/mai/2026 17:09 UTC via MCP apply_migration (ADR 0006).
-- Este arquivo registra a migration no repo para historico/auditabilidade.

DROP POLICY IF EXISTS notification_templates_select ON public.notification_templates;

CREATE POLICY notification_templates_select
ON public.notification_templates
FOR SELECT
TO authenticated
USING (
  is_supervisor_or_above((SELECT auth.uid()))
);

COMMENT ON POLICY notification_templates_select ON public.notification_templates IS
'Onda 8 (B-3): apenas supervisor_or_above (dev/admin/supervisor/manager) consegue ler templates via API client. Service_role bypassa RLS automaticamente.';
