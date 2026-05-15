DROP FUNCTION IF EXISTS public.validate_mcp_key(text);

CREATE OR REPLACE FUNCTION public.validate_mcp_key(_key_plain text)
RETURNS TABLE(key_id uuid, scopes text[], block_reason text, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    RETURN QUERY SELECT _row.id, NULL::text[], 'revoked'::text, _row.created_by;
    RETURN;
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN QUERY SELECT _row.id, NULL::text[], 'expired'::text, _row.created_by;
    RETURN;
  END IF;

  _is_full := _row.scopes @> ARRAY['*']::text[];
  IF _is_full THEN
    IF _row.created_by IS NULL THEN
      _grantor_is_dev := false;
    ELSE
      _grantor_is_dev := public.is_dev(_row.created_by);
    END IF;

    IF NOT _grantor_is_dev THEN
      UPDATE public.mcp_api_keys
        SET revoked_at = now(), updated_at = now()
        WHERE id = _row.id AND revoked_at IS NULL;

      INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
      VALUES (_row.id, _row.created_by, now(), 'manual', 'grantor_lost_dev_at_use');

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
          'reason', 'grantor_lost_dev_at_use',
          'is_full_access', true,
          'auto_revoked_at', now()
        )
      );

      INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
      VALUES (
        _row.created_by,
        'mcp_full_issue',
        _row.id::text,
        'auto_revoked',
        jsonb_build_object('reason','grantor_lost_dev_at_use','source','validate_mcp_key')
      );

      RETURN QUERY SELECT _row.id, NULL::text[], 'grantor_lost_dev'::text, _row.created_by;
      RETURN;
    END IF;
  END IF;

  UPDATE public.mcp_api_keys SET last_used_at = now() WHERE id = _row.id;

  RETURN QUERY SELECT _row.id, _row.scopes, NULL::text, _row.created_by;
END;
$$;