-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.6_security_auth - RPCs follow-up post merge
-- 17 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: check_rate_limit(text, text, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(_identifier text, _endpoint text, _max_requests integer DEFAULT 60, _window_seconds integer DEFAULT 60, _block_duration_seconds integer DEFAULT 3600) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _row record;
  _now timestamptz := now();
  _window_start timestamptz := _now - make_interval(secs => _window_seconds);
BEGIN
  -- Atomic upsert with row lock
  INSERT INTO public.request_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (_identifier, _endpoint, 1, _now)
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET 
    request_count = CASE 
      WHEN request_rate_limits.window_start < _window_start THEN 1
      ELSE request_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN request_rate_limits.window_start < _window_start THEN _now
      ELSE request_rate_limits.window_start
    END,
    blocked_until = CASE
      WHEN request_rate_limits.blocked_until IS NOT NULL AND request_rate_limits.blocked_until > _now 
        THEN request_rate_limits.blocked_until
      WHEN request_rate_limits.window_start >= _window_start AND request_rate_limits.request_count + 1 > _max_requests
        THEN _now + make_interval(secs => _block_duration_seconds)
      ELSE NULL
    END,
    updated_at = _now
  RETURNING * INTO _row;

  -- Currently blocked?
  IF _row.blocked_until IS NOT NULL AND _row.blocked_until > _now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', _row.blocked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_row.blocked_until - _now))::integer
    );
  END IF;

  -- Exceeded limit in current window?
  IF _row.request_count > _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_exceeded',
      'count', _row.request_count,
      'limit', _max_requests,
      'retry_after_seconds', _block_duration_seconds
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', _row.request_count,
    'limit', _max_requests,
    'remaining', GREATEST(_max_requests - _row.request_count, 0)
  );
END;
$$;


--

--

--

-- Name: cleanup_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_rate_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.request_rate_limits
  WHERE updated_at < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  DELETE FROM public.bot_detection_log
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;


--

--

--

-- Name: e2e_cleanup_check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.e2e_cleanup_check_rate_limit(p_key text, p_max integer, p_window_seconds integer) RETURNS TABLE(allowed boolean, current_count integer, reset_in_seconds integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO public.e2e_cleanup_rate_limit AS r (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN 1
          ELSE r.count + 1
        END,
        window_start = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN v_now
          ELSE r.window_start
        END,
        updated_at = v_now
  RETURNING r.count, r.window_start INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_max) AS allowed,
    v_count AS current_count,
    GREATEST(0, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_window_start))::INT) AS reset_in_seconds;
END;
$$;


--

--

--

-- Name: check_auth_throttling(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_auth_throttling(_email text, _ip text) RETURNS TABLE(allowed boolean, remaining_seconds integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    recent_failures INT;
    last_failure_at TIMESTAMP WITH TIME ZONE;
    lockout_duration INT; -- em segundos
    elapsed_since_last INT;
BEGIN
    -- Contar falhas consecutivas nos últimos 15 minutos para este email OU IP
    -- Usamos 15 minutos como janela de observação
    SELECT COUNT(*), MAX(created_at)
    INTO recent_failures, last_failure_at
    FROM auth_login_attempts
    WHERE (email = _email OR ip_address = _ip)
      AND success = false
      AND created_at > now() - INTERVAL '15 minutes';

    -- Se não houver falhas suficientes para bloqueio, permite (limite de 5 falhas)
    IF recent_failures < 5 THEN
        RETURN QUERY SELECT true, 0;
        RETURN;
    END IF;

    -- Bloqueio exponencial: 
    -- 5-9 falhas = 5 min
    -- 10-14 falhas = 15 min
    -- >=15 falhas = 60 min
    IF recent_failures < 10 THEN
        lockout_duration := 300; 
    ELSIF recent_failures < 15 THEN
        lockout_duration := 900;
    ELSE
        lockout_duration := 3600;
    END IF;

    elapsed_since_last := EXTRACT(EPOCH FROM (now() - last_failure_at))::INT;

    IF elapsed_since_last >= lockout_duration THEN
        RETURN QUERY SELECT true, 0;
    ELSE
        RETURN QUERY SELECT false, (lockout_duration - elapsed_since_last);
    END IF;
END;
$$;


--

--

--

-- Name: check_ip_access(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ip_access(_ip text) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _type TEXT;
BEGIN
  SELECT list_type INTO _type
  FROM public.ip_access_control
  WHERE ip_address = _ip
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  RETURN _type; -- returns 'allow', 'block', or NULL
END;
$$;


--

--

--

-- Name: auto_block_extreme_offenders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_block_extreme_offenders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _row record;
  _admin record;
  _blocked_count int := 0;
  _system_uid uuid;
  _expires timestamptz := now() + interval '6 hours';
BEGIN
  -- created_by precisa de uuid; usa o primeiro admin como ator do sistema
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOR _row IN
    WITH offenders AS (
      SELECT ip_address, count(*) AS cnt
      FROM (
        SELECT ip_address FROM public.login_attempts
          WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'
        UNION ALL
        SELECT ip_address FROM public.public_token_failures
          WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
        UNION ALL
        SELECT ip_address FROM public.bot_detection_log
          WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
      ) s
      GROUP BY ip_address
      HAVING count(*) >= 30
    )
    SELECT o.ip_address, o.cnt
    FROM offenders o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ip_access_control iac
      WHERE iac.ip_address = o.ip_address
        AND iac.list_type = 'block'
        AND (iac.expires_at IS NULL OR iac.expires_at > now())
    )
  LOOP
    INSERT INTO public.ip_access_control (
      ip_address, list_type, reason, expires_at, created_by
    ) VALUES (
      _row.ip_address,
      'block',
      format('Auto-bloqueio: %s ofensas em 1h', _row.cnt),
      _expires,
      _system_uid
    );

    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, ip_address, details
    ) VALUES (
      _system_uid,
      'auto_ip_block',
      'ip_access_control',
      _row.ip_address,
      _row.ip_address,
      jsonb_build_object('offense_count', _row.cnt, 'expires_at', _expires, 'window', '1h')
    );

    -- Notifica admins (dedupe por IP em 1h)
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.workspace_notifications
        WHERE user_id = _admin.user_id
          AND category = 'security'
          AND title = '🛡️ IP auto-bloqueado'
          AND metadata->>'ip' = _row.ip_address
          AND created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.workspace_notifications (
          user_id, title, message, type, category, action_url, metadata
        ) VALUES (
          _admin.user_id,
          '🛡️ IP auto-bloqueado',
          format('IP %s bloqueado por 6h após %s ofensas em 1h.', _row.ip_address, _row.cnt),
          'warning',
          'security',
          '/admin/seguranca-acesso',
          jsonb_build_object('ip', _row.ip_address, 'offense_count', _row.cnt, 'expires_at', _expires)
        );
      END IF;
    END LOOP;

    _blocked_count := _blocked_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'blocked', _blocked_count, 'ran_at', now());
END;
$$;


--

--

--

-- Name: validate_ip_access_control(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_ip_access_control() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.list_type NOT IN ('allow', 'block') THEN
    RAISE EXCEPTION 'Invalid list_type: must be allow or block';
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: fn_check_geo_access(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_geo_access(p_country_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_enabled BOOLEAN;
    v_is_allowed BOOLEAN;
BEGIN
    SELECT (setting_value->>'enabled')::BOOLEAN INTO v_enabled FROM public.security_settings WHERE setting_key = 'geo_blocking';
    IF v_enabled IS NOT TRUE THEN RETURN true; END IF;
    
    SELECT EXISTS(SELECT 1 FROM public.geo_allowed_countries WHERE country_code = UPPER(p_country_code) AND is_active = true) INTO v_is_allowed;
    RETURN v_is_allowed;
EXCEPTION WHEN OTHERS THEN
    RETURN true; -- Fail-open se a tabela security_settings ainda não existir ou falhar
END;
$$;


--

--

--

-- Name: clear_auth_attempts(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_auth_attempts(_email text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    DELETE FROM public.auth_login_attempts
    WHERE email = _email;
$$;


--

--

--

-- Name: record_auth_attempt(text, text, boolean, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_auth_attempt(_email text, _ip text, _success boolean, _reason text DEFAULT NULL::text, _ua text DEFAULT NULL::text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    INSERT INTO public.auth_login_attempts (email, ip_address, success, failure_reason, user_agent)
    VALUES (_email, _ip, _success, _reason, _ua);
$$;


--

--

--

-- Name: prevent_role_self_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_role_self_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: prevent_profile_role_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_profile_role_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change the role field on profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: cleanup_security_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_security_logs() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _token_failures_deleted int := 0;
  _bot_log_deleted int := 0;
  _audit_log_deleted int := 0;
  _ip_expired_deleted int := 0;
BEGIN
  WITH d AS (DELETE FROM public.public_token_failures WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _token_failures_deleted FROM d;

  WITH d AS (DELETE FROM public.bot_detection_log WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _bot_log_deleted FROM d;

  WITH d AS (DELETE FROM public.admin_audit_log WHERE created_at < now() - INTERVAL '365 days' RETURNING 1)
  SELECT count(*) INTO _audit_log_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ip_access_control
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _ip_expired_deleted FROM d;

  RETURN jsonb_build_object(
    'ok', true,
    'ran_at', now(),
    'public_token_failures_deleted', _token_failures_deleted,
    'bot_detection_log_deleted', _bot_log_deleted,
    'admin_audit_log_deleted', _audit_log_deleted,
    'ip_access_control_expired_deleted', _ip_expired_deleted
  );
END;
$$;


--

--

--

-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.workspace_notifications
  WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
END;
$$;


--

--

--

-- Name: purge_old_audit_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_old_audit_logs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    retention_days INT := 90;
    row_limit INT := 100000;
    current_count INT;
BEGIN
    -- 1. Remove logs older than the retention period
    DELETE FROM public.audit_logs
    WHERE created_at < now() - (retention_days || ' days')::interval;

    -- 2. Check total row count and trim if it exceeds the hard limit
    SELECT count(*) INTO current_count FROM public.audit_logs;
    
    IF current_count > row_limit THEN
        DELETE FROM public.audit_logs
        WHERE id IN (
            SELECT id
            FROM public.audit_logs
            ORDER BY created_at ASC
            LIMIT (current_count - row_limit)
        );
    END IF;
END;
$$;


--

--

--

-- Name: snapshot_hardening_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snapshot_hardening_status() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _details jsonb;
  _snapshot_id uuid;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || 'pg_trgm fora do schema extensions'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || 'Job cleanup-security-logs-daily inativo'; END IF;

  -- MFA enforced em app — assumido true (controlado em código)
  _score := _score + 1;

  _details := jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'sensitive_realtime_count', _sensitive_realtime,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true
  );

  INSERT INTO public.hardening_health_snapshots (score, max_score, failures, details)
  VALUES (_score, _max, _failures, _details)
  RETURNING id INTO _snapshot_id;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', _snapshot_id, 'score', _score, 'max', _max);
END;
$$;


--

--

--

-- Name: notify_hardening_regression(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_hardening_regression() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _admin record;
  _notified int := 0;
  _msg text;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || 'pg_trgm fora do schema extensions'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || 'Job cleanup-security-logs-daily inativo'; END IF;

  -- MFA enforced em app — assumido sempre true (controlado em código, não DB)
  _score := _score + 1;

  IF _score >= _max THEN
    RETURN jsonb_build_object('ok', true, 'score', _score, 'max', _max, 'notified', 0);
  END IF;

  _msg := format(
    'Saúde do hardening caiu para %s/%s. Falhas: %s. Acesse /admin/seguranca-acesso.',
    _score, _max, array_to_string(_failures, '; ')
  );

  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_notifications
      WHERE user_id = _admin.user_id
        AND category = 'security'
        AND title = '⚠️ Regressão de hardening detectada'
        AND created_at > now() - interval '20 hours'
    ) THEN
      INSERT INTO public.workspace_notifications (
        user_id, title, message, type, category, action_url, metadata
      ) VALUES (
        _admin.user_id,
        '⚠️ Regressão de hardening detectada',
        _msg,
        'warning',
        'security',
        '/admin/seguranca-acesso',
        jsonb_build_object('score', _score, 'max', _max, 'failures', _failures)
      );
      _notified := _notified + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'score', _score,
    'max', _max,
    'failures', _failures,
    'notified', _notified
  );
END;
$$;


--

--

COMMIT;
