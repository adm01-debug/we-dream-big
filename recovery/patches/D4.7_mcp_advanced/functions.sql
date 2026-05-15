-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.7_mcp_advanced - RPCs follow-up post merge
-- 10 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: auto_revoke_orphan_full_keys(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_revoke_orphan_full_keys(_source text DEFAULT 'cron'::text) RETURNS TABLE(key_id uuid, created_by uuid, revoked_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  IF _source NOT IN ('trigger','cron','manual') THEN
    RAISE EXCEPTION 'invalid source: %', _source USING ERRCODE = '22023';
  END IF;

  FOR _rec IN
    SELECT k.id, k.created_by
      FROM public.mcp_api_keys k
     WHERE k.revoked_at IS NULL
       AND '*' = ANY(k.scopes)
       AND NOT public.is_dev(k.created_by)
     FOR UPDATE
  LOOP
    -- Revoga a chave (trigger existente log_mcp_key_revocation registra a mudança)
    UPDATE public.mcp_api_keys
       SET revoked_at = _now,
           updated_at = _now
     WHERE id = _rec.id
       AND revoked_at IS NULL;

    -- Log dedicado do mecanismo de defesa
    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, _rec.created_by, _now, _source, 'creator_lost_dev_role');

    -- Correlação forense no audit log de step-up (mesma trilha das emissões FULL)
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      _rec.created_by,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object(
        'reason', 'creator_lost_dev_role',
        'source', _source
      )
    );

    key_id := _rec.id;
    created_by := _rec.created_by;
    revoked_at := _now;
    RETURN NEXT;
  END LOOP;
END;
$$;


--

--

--

-- Name: check_mcp_abuse_threshold(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_mcp_abuse_threshold(_user_id uuid, _ip text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_window INTERVAL := INTERVAL '10 minutes';
  v_threshold INTEGER := 5;
  v_count_user INTEGER := 0;
  v_count_ip INTEGER := 0;
  v_admin RECORD;
  v_already_alerted BOOLEAN := false;
BEGIN
  -- Conta violações na janela
  IF _user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_user
    FROM public.mcp_access_violations
    WHERE user_id = _user_id
      AND created_at >= now() - v_window;
  END IF;

  IF _ip IS NOT NULL AND _ip <> '' THEN
    SELECT COUNT(*) INTO v_count_ip
    FROM public.mcp_access_violations
    WHERE ip_address = _ip
      AND created_at >= now() - v_window;
  END IF;

  IF v_count_user < v_threshold AND v_count_ip < v_threshold THEN
    RETURN;
  END IF;

  -- Evita disparos duplicados: se já houver alerta nos últimos 10min para mesmo user/ip, sai
  SELECT EXISTS (
    SELECT 1 FROM public.admin_audit_log
    WHERE action = 'mcp_abuse_detected'
      AND created_at >= now() - v_window
      AND (
        (details->>'user_id') = _user_id::text
        OR (details->>'ip_address') = _ip
      )
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    RETURN;
  END IF;

  -- Registra evento de auditoria
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id,
    ip_address, details, source, status
  ) VALUES (
    COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'mcp_abuse_detected',
    'mcp_api_keys',
    NULL,
    _ip,
    jsonb_build_object(
      'user_id', _user_id,
      'ip_address', _ip,
      'window_minutes', 10,
      'threshold', v_threshold,
      'violations_user', v_count_user,
      'violations_ip', v_count_ip
    ),
    'mcp_abuse_detector',
    'denied'
  );

  -- Notifica admins
  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role
  LOOP
    INSERT INTO public.workspace_notifications (
      user_id, title, message, type, category, action_url, metadata
    ) VALUES (
      v_admin.user_id,
      'Possível abuso em chaves MCP',
      format(
        'Detectadas %s tentativas bloqueadas em 10 min%s.',
        GREATEST(v_count_user, v_count_ip),
        CASE WHEN _ip IS NOT NULL THEN ' (IP: ' || _ip || ')' ELSE '' END
      ),
      'warning',
      'security',
      '/admin/seguranca',
      jsonb_build_object(
        'event', 'mcp_abuse_detected',
        'user_id', _user_id,
        'ip_address', _ip,
        'violations_user', v_count_user,
        'violations_ip', v_count_ip
      )
    );
  END LOOP;
END;
$$;


--

--

--

-- Name: guard_mcp_api_keys_writes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_mcp_api_keys_writes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role TEXT := current_setting('role', true);
  v_actor UUID := auth.uid();
BEGIN
  -- Se for service_role (edge functions), permite normalmente
  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Caso contrário, registra violação e bloqueia
  PERFORM public.record_mcp_access_violation(
    v_actor,
    'unauthorized_direct_write',
    'db_trigger:mcp_api_keys',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    NULL,
    NULL,
    NULL,
    jsonb_build_object('current_user', current_user, 'role', v_role)
  );

  RAISE EXCEPTION 'Direct writes to mcp_api_keys are not allowed';
END;
$$;


--

--

--

-- Name: log_mcp_key_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_mcp_key_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  actor uuid;
  changed jsonb := '{}'::jsonb;
  fields text[] := ARRAY[]::text[];
  was_full boolean;
  is_now_full boolean;
  escalated boolean := false;
BEGIN
  actor := public.mcp_audit_actor(NEW.created_by);

  -- Caso 1: revogação (NULL -> NOT NULL)
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor,
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes),
        'revoked_at', NEW.revoked_at
      )
    );
    RETURN NEW;
  END IF;

  -- Caso 2: alteração de campos sensíveis
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    fields := array_append(fields, 'name');
    changed := changed || jsonb_build_object('name', jsonb_build_object('before', OLD.name, 'after', NEW.name));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    fields := array_append(fields, 'description');
    changed := changed || jsonb_build_object('description', jsonb_build_object('before', OLD.description, 'after', NEW.description));
  END IF;
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    fields := array_append(fields, 'expires_at');
    changed := changed || jsonb_build_object('expires_at', jsonb_build_object('before', OLD.expires_at, 'after', NEW.expires_at));
  END IF;
  IF NEW.scopes IS DISTINCT FROM OLD.scopes THEN
    fields := array_append(fields, 'scopes');
    changed := changed || jsonb_build_object('scopes', jsonb_build_object('before', OLD.scopes, 'after', NEW.scopes));
    was_full := '*' = ANY(COALESCE(OLD.scopes, ARRAY[]::text[]));
    is_now_full := '*' = ANY(COALESCE(NEW.scopes, ARRAY[]::text[]));
    IF NOT was_full AND is_now_full THEN
      escalated := true;
    END IF;
  END IF;

  IF array_length(fields, 1) IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor,
      'mcp_key.updated',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'fields_changed', fields,
        'diff', changed,
        'escalated_to_full', escalated
      )
    );

    IF escalated THEN
      INSERT INTO public.admin_audit_log (
        user_id, action, resource_type, resource_id, details
      ) VALUES (
        actor,
        'mcp_key.scope_escalated',
        'mcp_api_key',
        NEW.id::text,
        jsonb_build_object(
          'key_prefix', NEW.key_prefix,
          'name', NEW.name,
          'before_scopes', OLD.scopes,
          'after_scopes', NEW.scopes
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--

--

--

-- Name: log_mcp_key_revocation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_mcp_key_revocation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Dispara apenas quando revoked_at passa de NULL para NOT NULL
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      COALESCE(auth.uid(), NEW.created_by),
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes),
        'revoked_at', NEW.revoked_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: mcp_audit_actor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mcp_audit_actor(_fallback uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  jwt_sub text;
  header_actor text;
BEGIN
  -- Header customizado setado pelas edge functions (set_config('request.jwt.claim.sub', ...))
  BEGIN
    header_actor := current_setting('request.mcp_actor', true);
  EXCEPTION WHEN OTHERS THEN
    header_actor := NULL;
  END;
  IF header_actor IS NOT NULL AND header_actor <> '' THEN
    RETURN header_actor::uuid;
  END IF;

  -- JWT padrão Supabase
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  BEGIN
    jwt_sub := current_setting('request.jwt.claims', true)::jsonb->>'sub';
  EXCEPTION WHEN OTHERS THEN
    jwt_sub := NULL;
  END;
  IF jwt_sub IS NOT NULL AND jwt_sub <> '' THEN
    RETURN jwt_sub::uuid;
  END IF;

  RETURN _fallback;
END;
$$;


--

--

--

-- Name: record_mcp_access_violation(uuid, text, text, text, uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_mcp_access_violation(_user_id uuid, _reason text, _source text, _operation text DEFAULT NULL::text, _target_key_id uuid DEFAULT NULL::uuid, _ip text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _request_id text DEFAULT NULL::text, _details jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.mcp_access_violations (
    user_id, reason, source, operation, target_key_id,
    ip_address, user_agent, request_id, details
  ) VALUES (
    _user_id, _reason, _source, _operation, _target_key_id,
    _ip, _user_agent, _request_id, COALESCE(_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  PERFORM public.check_mcp_abuse_threshold(_user_id, _ip);

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Nunca derruba a operação chamadora
  RAISE WARNING 'record_mcp_access_violation failed: %', SQLERRM;
  RETURN NULL;
END;
$$;


--

--

--

-- Name: trg_auto_revoke_mcp_on_role_loss(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_auto_revoke_mcp_on_role_loss() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  -- Só agimos quando uma role 'dev' é removida E o usuário não tem outra linha 'dev'
  IF OLD.role IS DISTINCT FROM 'dev'::app_role THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = OLD.user_id AND role = 'dev'::app_role
  ) THEN
    -- Ainda é dev por outra atribuição: nada a fazer
    RETURN OLD;
  END IF;

  FOR _rec IN
    SELECT id FROM public.mcp_api_keys
     WHERE created_by = OLD.user_id
       AND revoked_at IS NULL
       AND '*' = ANY(scopes)
     FOR UPDATE
  LOOP
    UPDATE public.mcp_api_keys
       SET revoked_at = _now, updated_at = _now
     WHERE id = _rec.id AND revoked_at IS NULL;

    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, OLD.user_id, _now, 'trigger', 'creator_lost_dev_role');

    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      OLD.user_id,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object('reason','creator_lost_dev_role','source','trigger')
    );
  END LOOP;

  RETURN OLD;
END;
$$;


--

--

--

-- Name: validate_mcp_key(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_mcp_key(_key_plain text) RETURNS TABLE(key_id uuid, scopes text[], block_reason text, created_by uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

--

-- Name: log_full_scope_grant(text, uuid, text, uuid, uuid, text, boolean, timestamp with time zone, inet, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_full_scope_grant(_operation text, _key_id uuid, _key_prefix text, _challenge_id uuid DEFAULT NULL::uuid, _token_id uuid DEFAULT NULL::uuid, _justification text DEFAULT NULL::text, _confirmation_phrase_ok boolean DEFAULT NULL::boolean, _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text, _request_id text DEFAULT NULL::text, _extra jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

COMMIT;
