-- =========================================================
-- Auditoria padronizada de concessões de FULL scope
-- =========================================================

-- 1) Helper RPC: chamada pelas edges após emitir/rotacionar/escalar uma chave full.
--    Escreve um evento "full_scope_granted" em step_up_audit_log com correlação
--    completa (challenge → token → key) + quais verificações foram aplicadas.
CREATE OR REPLACE FUNCTION public.log_full_scope_grant(
  _operation TEXT,                  -- 'issue' | 'rotate' | 'escalate'
  _key_id UUID,
  _key_prefix TEXT,
  _challenge_id UUID DEFAULT NULL,
  _token_id UUID DEFAULT NULL,
  _justification TEXT DEFAULT NULL,
  _confirmation_phrase_ok BOOLEAN DEFAULT NULL,
  _expires_at TIMESTAMPTZ DEFAULT NULL,
  _ip INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _request_id TEXT DEFAULT NULL,
  _extra JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _action public.step_up_action;
  _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Mapeia operação → step_up_action
  _action := CASE _operation
    WHEN 'escalate' THEN 'mcp_full_escalate'::public.step_up_action
    ELSE 'mcp_full_issue'::public.step_up_action
  END;

  INSERT INTO public.step_up_audit_log (
    user_id, action, target_ref, event_type,
    challenge_id, token_id, ip_address, user_agent, metadata
  ) VALUES (
    _uid, _action, _key_id::text, 'full_scope_granted',
    _challenge_id, _token_id, _ip, _user_agent,
    jsonb_build_object(
      'operation',          _operation,
      'key_id',             _key_id,
      'key_prefix',         _key_prefix,
      'expires_at',         _expires_at,
      'justification',      _justification,
      'verifications', jsonb_build_object(
        'is_dev_recheck',         true,    -- garantido pela edge antes de chamar
        'step_up_token_consumed', _token_id IS NOT NULL,
        'can_grant_mcp_full',     true,    -- garantido pela edge antes de chamar
        'confirmation_phrase_ok', COALESCE(_confirmation_phrase_ok, true),
        'has_justification',      _justification IS NOT NULL AND length(_justification) > 0
      ),
      'request_id',         _request_id,
      'granted_at',         now(),
      'extra',              _extra
    )
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

COMMENT ON FUNCTION public.log_full_scope_grant IS
'Registra concessão de FULL scope (issue/rotate/escalate) em step_up_audit_log com correlação completa (challenge, token, key) e checklist de verificações server-side aplicadas.';

REVOKE ALL ON FUNCTION public.log_full_scope_grant(
  TEXT, UUID, TEXT, UUID, UUID, TEXT, BOOLEAN, TIMESTAMPTZ, INET, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_full_scope_grant(
  TEXT, UUID, TEXT, UUID, UUID, TEXT, BOOLEAN, TIMESTAMPTZ, INET, TEXT, TEXT, JSONB
) TO authenticated;

-- 2) View consolidada para o time de segurança
CREATE OR REPLACE VIEW public.v_full_scope_grants AS
SELECT
  sual.id                                              AS audit_id,
  sual.created_at                                      AS granted_at,
  sual.user_id                                         AS granted_to_user_id,
  p.full_name                                          AS granted_to_name,
  u.email                                              AS granted_to_email,
  sual.action                                          AS step_up_action,
  (sual.metadata->>'operation')                        AS operation,
  (sual.metadata->>'key_id')::uuid                     AS key_id,
  (sual.metadata->>'key_prefix')                       AS key_prefix,
  (sual.metadata->>'expires_at')::timestamptz          AS key_expires_at,
  (sual.metadata->>'justification')                    AS justification,
  sual.challenge_id,
  sual.token_id,
  sual.ip_address,
  sual.user_agent,
  (sual.metadata->>'request_id')                       AS request_id,
  (sual.metadata->'verifications')                     AS verifications_applied,
  (sual.metadata->'extra')                             AS extra
FROM public.step_up_audit_log sual
LEFT JOIN public.profiles p ON p.id = sual.user_id
LEFT JOIN auth.users u      ON u.id = sual.user_id
WHERE sual.event_type = 'full_scope_granted';

COMMENT ON VIEW public.v_full_scope_grants IS
'Histórico completo de concessões de FULL scope (chaves MCP com escopo *). Restringida via RLS herdada de step_up_audit_log: apenas dev ou o próprio usuário.';

-- security_invoker faz a view respeitar as policies RLS de step_up_audit_log
ALTER VIEW public.v_full_scope_grants SET (security_invoker = on);