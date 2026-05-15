-- ═══════════════════════════════════════════════════════════════════
-- PATCH D2.4_external_connections — External Connections
-- Prioridade: P2
-- Extraído por extract_d2.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.external_connections ───────────
CREATE TABLE IF NOT EXISTS public.external_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_refs text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'unconfigured'::text NOT NULL,
    last_test_at timestamp with time zone,
    last_test_ok boolean,
    last_test_message text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_latency_ms integer,
    env_key text,
    auto_test_enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT external_connections_status_check CHECK ((status = ANY (ARRAY['unconfigured'::text, 'active'::text, 'degraded'::text, 'error'::text, 'disabled'::text]))),
    CONSTRAINT external_connections_type_check CHECK ((type = ANY (ARRAY['supabase'::text, 'bitrix24'::text, 'n8n'::text, 'mcp'::text, 'webhook_outbound'::text, 'webhook_inbound'::text])))
);

ALTER TABLE public.external_connections ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.external_connections
    ADD CONSTRAINT external_connections_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.external_connections
    ADD CONSTRAINT external_connections_type_name_key UNIQUE (type, name); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.external_connections (4) ───────────
CREATE UNIQUE INDEX IF NOT EXISTS external_connections_type_name_no_env_uidx ON public.external_connections USING btree (type, name) WHERE (env_key IS NULL);
CREATE INDEX IF NOT EXISTS idx_external_connections_auto_test_enabled ON public.external_connections USING btree (auto_test_enabled) WHERE (auto_test_enabled = true);
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_connections_envkey_type ON public.external_connections USING btree (env_key, type) WHERE (env_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_external_connections_type ON public.external_connections USING btree (type);

-- ─────────── POLICIES: public.external_connections (1) ───────────
DROP POLICY IF EXISTS "Devs manage external_connections" ON public.external_connections;
CREATE POLICY "Devs manage external_connections" ON public.external_connections TO authenticated USING (public.is_dev(auth.uid())) WITH CHECK (public.is_dev(auth.uid()));

-- ─────────── FUNCTION: public.get_connection_failure_window_minutes ───────────
CREATE OR REPLACE FUNCTION public.get_connection_failure_window_minutes() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT (value)::text::int FROM public.system_settings
     WHERE key = 'connection_failure_window_minutes'),
    30
  );
$$;

-- ─────────── FUNCTION: public.set_connection_failure_window_minutes ───────────
CREATE OR REPLACE FUNCTION public.set_connection_failure_window_minutes(minutes integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF minutes NOT IN (0, 15, 30, 60, 120, 240) THEN
    RAISE EXCEPTION 'invalid window: must be one of 0, 15, 30, 60, 120, 240 minutes';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_by, updated_at)
  VALUES ('connection_failure_window_minutes', to_jsonb(minutes), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    'connection_failure_window_changed',
    'system_setting',
    'connection_failure_window_minutes',
    jsonb_build_object('minutes', minutes)
  );

  RETURN minutes;
END;
$$;

-- ─────────── FUNCTION: public.get_connections_auto_test_interval ───────────
CREATE OR REPLACE FUNCTION public.get_connections_auto_test_interval() RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'cron'
    AS $_$
DECLARE
  s text;
  m text;
BEGIN
  SELECT schedule INTO s FROM cron.job WHERE jobname = 'connections-auto-test' LIMIT 1;
  IF s IS NULL THEN RETURN NULL; END IF;
  -- Expect "*/N * * * *" or "N * * * *"
  m := split_part(s, ' ', 1);
  IF m LIKE '*/%' THEN
    RETURN NULLIF(substring(m FROM 3), '')::int;
  ELSIF m ~ '^[0-9]+$' THEN
    -- Single-minute schedule means "once per hour at minute N" → treat as 60
    RETURN 60;
  END IF;
  RETURN NULL;
END;
$_$;

-- ─────────── FUNCTION: public.set_connections_auto_test_interval ───────────
CREATE OR REPLACE FUNCTION public.set_connections_auto_test_interval(minutes integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'cron'
    AS $$
DECLARE
  schedule text;
  job_id bigint;
BEGIN
  -- Admin only
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF minutes NOT IN (5, 10, 15, 30, 60, 120, 240) THEN
    RAISE EXCEPTION 'invalid interval: must be one of 5, 10, 15, 30, 60, 120, 240 minutes';
  END IF;

  IF minutes < 60 THEN
    schedule := '*/' || minutes::text || ' * * * *';
  ELSIF minutes = 60 THEN
    schedule := '0 * * * *';
  ELSIF minutes = 120 THEN
    schedule := '0 */2 * * *';
  ELSIF minutes = 240 THEN
    schedule := '0 */4 * * *';
  END IF;

  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'connections-auto-test' LIMIT 1;
  IF job_id IS NULL THEN
    RAISE EXCEPTION 'cron job connections-auto-test not found';
  END IF;

  PERFORM cron.alter_job(job_id := job_id, schedule := schedule);

  -- Audit
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    'connections_auto_test_interval_changed',
    'cron_job',
    job_id::text,
    jsonb_build_object('minutes', minutes, 'schedule', schedule)
  );

  RETURN minutes;
END;
$$;

-- ─────────── FUNCTION: public.sync_external_connections_from_credentials ───────────
CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_anon boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
BEGIN
  -- Ator de sistema: qualquer admin (created_by é NOT NULL)
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOREACH _env_key IN ARRAY _env_keys LOOP
    _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
    _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
    _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;

    IF _has_url AND _has_svc THEN
      _status := 'active';
    ELSE
      _status := 'unconfigured';
    END IF;

    _name := CASE _env_key
      WHEN 'promobrind' THEN 'Catálogo Promobrind'
      WHEN 'crm' THEN 'CRM Promobrind'
      ELSE initcap(_env_key)
    END;

    INSERT INTO public.external_connections (
      type, name, env_key, config, secret_refs, status, created_by
    ) VALUES (
      'supabase',
      _name,
      _env_key,
      jsonb_build_object('mirrored_from', 'integration_credentials'),
      ARRAY[_url_name, _anon_name, _svc_name],
      _status,
      _system_uid
    )
    ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
    SET status = EXCLUDED.status,
        secret_refs = EXCLUDED.secret_refs,
        name = EXCLUDED.name,
        updated_at = now();

    _processed := _processed + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'processed', _processed, 'ran_at', now());
END;
$$;

-- ─────────── FUNCTION: public.sync_external_connections_from_credentials ───────────
CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials(_trigger_secret_name text DEFAULT NULL::text, _trigger_op text DEFAULT 'manual'::text, _trigger_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_anon boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
  _created int := 0;
  _updated int := 0;
  _is_insert boolean;
  _start timestamptz := clock_timestamp();
  _result jsonb;
  _err text;
BEGIN
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message,
      duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      0, 0, 0, 'no_admin', 'no_admin_for_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;

      IF _has_url AND _has_svc THEN
        _status := 'active';
      ELSE
        _status := 'unconfigured';
      END IF;

      _name := CASE _env_key
        WHEN 'promobrind' THEN 'Catálogo Promobrind'
        WHEN 'crm' THEN 'CRM Promobrind'
        ELSE initcap(_env_key)
      END;

      -- Detecta se é INSERT ou UPDATE para contagem
      SELECT NOT EXISTS (
        SELECT 1 FROM public.external_connections
        WHERE env_key = _env_key AND type = 'supabase'
      ) INTO _is_insert;

      INSERT INTO public.external_connections (
        type, name, env_key, config, secret_refs, status, created_by
      ) VALUES (
        'supabase',
        _name,
        _env_key,
        jsonb_build_object('mirrored_from', 'integration_credentials'),
        ARRAY[_url_name, _anon_name, _svc_name],
        _status,
        _system_uid
      )
      ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status,
          secret_refs = EXCLUDED.secret_refs,
          name = EXCLUDED.name,
          updated_at = now();

      IF _is_insert THEN
        _created := _created + 1;
      ELSE
        _updated := _updated + 1;
      END IF;
      _processed := _processed + 1;
    END LOOP;

    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status,
      duration_ms, details
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'ok',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int,
      jsonb_build_object('env_keys', _env_keys)
    );

    _result := jsonb_build_object(
      'ok', true,
      'processed', _processed,
      'created', _created,
      'updated', _updated,
      'ran_at', now()
    );
    RETURN _result;

  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message,
      duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'error', _err,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RAISE;
  END;
END;
$$;

COMMIT;