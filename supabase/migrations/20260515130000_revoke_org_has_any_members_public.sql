-- =============================================================================
-- Hotfix CI — REVOKE EXECUTE de org_has_any_members(_org_id uuid)
--
-- Contexto:
--   A migration 20260514000000_fix_policy_idempotency_and_security.sql criou a
--   função SECURITY DEFINER public.org_has_any_members(_org_id uuid) para ser
--   chamada em policy WITH CHECK de organization_members (INSERT bootstrap).
--   Postgres concede EXECUTE para PUBLIC por default em CREATE FUNCTION, e a
--   migration original não revogou — o gate audit_security_definer_acl() do CI
--   (lints Supabase 0028/0029) começou a falhar em main.
--
-- Decisão:
--   A função só é chamada em contexto authenticated (policy de INSERT em
--   organization_members exige TO authenticated). Não pertence à whitelist
--   public_intent (submit_quote_response, get_quote_token_by_value).
--   Logo: REVOKE PUBLIC + anon, GRANT authenticated.
--
-- Defesa em profundidade:
--   Mesmo que anon conseguisse executar a função, ela só lê organization_members
--   que tem RLS — anon não passa. Esta migration fecha o gate ACL e mantém o
--   padrão estabelecido pela Onda 1 de hardening (20260427114657).
--
-- rls-helper: helper SECURITY DEFINER chamado de policy WITH CHECK
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.org_has_any_members(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.org_has_any_members(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.org_has_any_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.org_has_any_members(uuid) IS
'Helper SECURITY DEFINER chamado por policy WITH CHECK em organization_members (INSERT bootstrap). Authenticated-only. ACL hardened via 20260515130000.';
