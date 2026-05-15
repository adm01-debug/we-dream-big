-- =========================================================
-- Hardening: validate_mcp_key re-checa is_dev() do emissor para chaves full
-- Defesa em profundidade — se o criador perdeu o papel dev, a chave é
-- revogada automaticamente em runtime e a chamada é negada.
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_mcp_key(_key_plain text)
RETURNS TABLE(key_id uuid, scopes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
  _row record;
  _is_full boolean;
  _grantor_is_dev boolean;
BEGIN
  IF _key_plain IS NULL OR length(_key_plain) < 16 THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(_key_plain, 'sha256'), 'hex');

  SELECT id, mcp_api_keys.scopes, expires_at, revoked_at, created_by
  INTO _row
  FROM public.mcp_api_keys
  WHERE key_hash = _hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _row.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN;
  END IF;

  -- Re-checagem crítica para chaves FULL: o emissor ainda precisa ser dev
  _is_full := _row.scopes @> ARRAY['*']::text[];
  IF _is_full THEN
    IF _row.created_by IS NULL THEN
      _grantor_is_dev := false;
    ELSE
      _grantor_is_dev := public.is_dev(_row.created_by);
    END IF;

    IF NOT _grantor_is_dev THEN
      -- Auto-revoga e audita
      UPDATE public.mcp_api_keys
        SET revoked_at = now()
        WHERE id = _row.id AND revoked_at IS NULL;

      INSERT INTO public.admin_audit_log (
        user_id, action, resource_type, resource_id,
        status, source, details
      ) VALUES (
        _row.created_by,
        'mcp_key.auto_revoked',
        'mcp_api_key',
        _row.id,
        'denied',
        'validate_mcp_key',
        jsonb_build_object(
          'reason', 'grantor_lost_dev',
          'is_full_access', true,
          'auto_revoked_at', now()
        )
      );
      RETURN;
    END IF;
  END IF;

  UPDATE public.mcp_api_keys SET last_used_at = now() WHERE id = _row.id;

  RETURN QUERY SELECT _row.id, _row.scopes;
END;
$$;

COMMENT ON FUNCTION public.validate_mcp_key(text) IS
'Valida chave MCP em runtime. Para chaves com escopo *, re-checa se o emissor (created_by) ainda é dev — caso contrário a chave é auto-revogada e a chamada negada.';