-- ============================================================================
-- Edge Function Secrets Setup — Vault
-- ----------------------------------------------------------------------------
-- ORIGEM: Aplicado via MCP `apply_migration` em 2026-05-14 11:20 UTC,
--         em conformidade com ADR 0006 (db push proibido).
-- ESTE ARQUIVO É SNAPSHOT — não será re-aplicado por `supabase db reset`
-- (ADR 0006: banco é SSOT, repo é histórico).
--
-- Provisiona dois secrets no Supabase Vault para hardening de autenticação
-- das edge functions `webhook-dispatcher` e `connections-auto-test`.
--
-- O mesmo valor de secret precisa ser configurado em:
-- 1) Supabase Dashboard → Edge Functions → Secrets (Deno.env.get)
-- 2) Aqui, no vault.secrets (para chamadores SQL: cron, triggers, RPCs)
--
-- IMPORTANTE: os valores reais dos secrets NÃO estão neste arquivo —
-- foram inseridos diretamente no vault. Para reset/replay use placeholders
-- e atualize via vault.update_secret() depois.
-- ============================================================================

DO $$
BEGIN
  -- WEBHOOK_DISPATCHER_SECRET
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'WEBHOOK_DISPATCHER_SECRET') THEN
    PERFORM vault.create_secret(
      'PLACEHOLDER_SET_VIA_VAULT_UPDATE',
      'WEBHOOK_DISPATCHER_SECRET',
      'Secret para autenticar chamadas ao webhook-dispatcher edge function (Modo A). Sincronizar com painel Supabase Edge Functions Secrets.'
    );
  END IF;

  -- CONNECTIONS_AUTO_TEST_SECRET
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'CONNECTIONS_AUTO_TEST_SECRET') THEN
    PERFORM vault.create_secret(
      'PLACEHOLDER_SET_VIA_VAULT_UPDATE',
      'CONNECTIONS_AUTO_TEST_SECRET',
      'Secret para autenticar chamadas ao connections-auto-test edge function (cron job). Sincronizar com painel Supabase Edge Functions Secrets.'
    );
  END IF;
END $$;
