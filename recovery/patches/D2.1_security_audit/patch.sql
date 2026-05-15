-- ═══════════════════════════════════════════════════════════════════
-- PATCH D2.1_security_audit — Security & Audit Logs
-- Prioridade: P2
-- Extraído por extract_d2.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.access_security_settings ───────────
CREATE TABLE IF NOT EXISTS public.access_security_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_whitelist_enabled boolean DEFAULT false,
    city_whitelist_enabled boolean DEFAULT false,
    block_unknown_locations boolean DEFAULT false,
    max_failed_attempts integer DEFAULT 5,
    lockout_duration_minutes integer DEFAULT 15,
    strict_access_mode boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.access_security_settings ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.access_security_settings
    ADD CONSTRAINT access_security_settings_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── POLICIES: public.access_security_settings (2) ───────────
DROP POLICY IF EXISTS "Admins e Devs podem atualizar configurações de segurança" ON public.access_security_settings;
CREATE POLICY "Admins e Devs podem atualizar configurações de segurança" ON public.access_security_settings FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));

DROP POLICY IF EXISTS "Admins e Devs podem visualizar configurações de segurança" ON public.access_security_settings;
CREATE POLICY "Admins e Devs podem visualizar configurações de segurança" ON public.access_security_settings FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));

-- ─────────── TABLE: public.audit_logs ───────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    endpoint text NOT NULL,
    identifier text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.audit_logs (3) ───────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_identifier ON public.audit_logs USING btree (identifier);

-- ─────────── POLICIES: public.audit_logs (1) ───────────
DROP POLICY IF EXISTS "Admins e Devs podem visualizar logs de auditoria" ON public.audit_logs;
CREATE POLICY "Admins e Devs podem visualizar logs de auditoria" ON public.audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));

-- ─────────── TABLE: public.auth_login_attempts ───────────
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip_address text,
    success boolean DEFAULT false NOT NULL,
    failure_reason text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.auth_login_attempts
    ADD CONSTRAINT auth_login_attempts_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.auth_login_attempts (2) ───────────
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_created ON public.auth_login_attempts USING btree (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_ip_created ON public.auth_login_attempts USING btree (ip_address, created_at DESC);

-- ─────────── TABLE: public.geo_allowed_countries ───────────
CREATE TABLE IF NOT EXISTS public.geo_allowed_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character(2) NOT NULL,
    country_name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

ALTER TABLE public.geo_allowed_countries ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_country_code_key UNIQUE (country_code); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.geo_allowed_countries (1) ───────────
CREATE INDEX IF NOT EXISTS idx_geo_allowed_countries_created_by ON public.geo_allowed_countries USING btree (created_by);

-- ─────────── POLICIES: public.geo_allowed_countries (1) ───────────
DROP POLICY IF EXISTS "Users can view allowed countries" ON public.geo_allowed_countries;
CREATE POLICY "Users can view allowed countries" ON public.geo_allowed_countries FOR SELECT USING (true);

-- ─────────── TABLE: public.hardening_health_snapshots ───────────
CREATE TABLE IF NOT EXISTS public.hardening_health_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    score integer NOT NULL,
    max_score integer DEFAULT 5 NOT NULL,
    failures text[] DEFAULT ARRAY[]::text[] NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.hardening_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.hardening_health_snapshots
    ADD CONSTRAINT hardening_health_snapshots_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.hardening_health_snapshots (1) ───────────
CREATE INDEX IF NOT EXISTS idx_hardening_snapshots_at ON public.hardening_health_snapshots USING btree (snapshot_at DESC);

-- ─────────── POLICIES: public.hardening_health_snapshots (1) ───────────
DROP POLICY IF EXISTS "Devs read hardening snapshots" ON public.hardening_health_snapshots;
CREATE POLICY "Devs read hardening snapshots" ON public.hardening_health_snapshots FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));

-- ─────────── TABLE: public.rls_denial_log ───────────
CREATE TABLE IF NOT EXISTS public.rls_denial_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text,
    user_role text,
    table_name text NOT NULL,
    operation text NOT NULL,
    endpoint text,
    query_summary text,
    target_id uuid,
    target_seller_id uuid,
    policy_hint text,
    error_code text,
    error_message text,
    user_agent text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rls_denial_log_operation_check CHECK ((operation = ANY (ARRAY['SELECT'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);

ALTER TABLE public.rls_denial_log ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.rls_denial_log
    ADD CONSTRAINT rls_denial_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.rls_denial_log (3) ───────────
CREATE INDEX IF NOT EXISTS idx_rls_denial_created ON public.rls_denial_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rls_denial_table ON public.rls_denial_log USING btree (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rls_denial_user ON public.rls_denial_log USING btree (user_id, created_at DESC);

-- ─────────── POLICIES: public.rls_denial_log (5) ───────────
DROP POLICY IF EXISTS "Admins can delete old logs" ON public.rls_denial_log;
CREATE POLICY "Admins can delete old logs" ON public.rls_denial_log FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

DROP POLICY IF EXISTS "Admins read rls denials" ON public.rls_denial_log;
CREATE POLICY "Admins read rls denials" ON public.rls_denial_log FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));

DROP POLICY IF EXISTS "Block direct insert" ON public.rls_denial_log;
CREATE POLICY "Block direct insert" ON public.rls_denial_log FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Block direct update" ON public.rls_denial_log;
CREATE POLICY "Block direct update" ON public.rls_denial_log FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS rls_denial_log_select_policy ON public.rls_denial_log;
CREATE POLICY rls_denial_log_select_policy ON public.rls_denial_log FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));

-- ─────────── TABLE: public.step_up_audit_log ───────────
CREATE TABLE IF NOT EXISTS public.step_up_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action public.step_up_action,
    target_ref text,
    event_type text NOT NULL,
    challenge_id uuid,
    token_id uuid,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.step_up_audit_log ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.step_up_audit_log
    ADD CONSTRAINT step_up_audit_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.step_up_audit_log (2) ───────────
CREATE INDEX IF NOT EXISTS idx_step_up_audit_action ON public.step_up_audit_log USING btree (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_up_audit_user ON public.step_up_audit_log USING btree (user_id, created_at DESC);

-- ─────────── POLICIES: public.step_up_audit_log (2) ───────────
DROP POLICY IF EXISTS "Devs can view all audit logs" ON public.step_up_audit_log;
CREATE POLICY "Devs can view all audit logs" ON public.step_up_audit_log FOR SELECT USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "Users can view own audit logs" ON public.step_up_audit_log;
CREATE POLICY "Users can view own audit logs" ON public.step_up_audit_log FOR SELECT USING ((auth.uid() = user_id));

-- ─────────── FUNCTION: public.log_access_denied ───────────
CREATE OR REPLACE FUNCTION public.log_access_denied(_blocked_path text, _required_role text, _user_role text DEFAULT NULL::text, _reason text DEFAULT 'route_blocked'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    -- Não autenticado: ignora silenciosamente (não polui o log)
    RETURN;
  END IF;

  IF _required_role NOT IN ('dev','admin','supervisor') THEN
    RAISE EXCEPTION 'invalid required_role: %', _required_role;
  END IF;

  INSERT INTO public.admin_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    status,
    source,
    started_at,
    finished_at,
    duration_ms,
    request_id,
    payload_summary,
    details
  ) VALUES (
    _uid,
    'route.access_denied',
    'route',
    _blocked_path,
    'denied',
    'frontend-guard',
    now(),
    now(),
    0,
    gen_random_uuid()::text,
    jsonb_build_object('blocked_path', _blocked_path),
    jsonb_build_object(
      'reason', _reason,
      'blocked_path', _blocked_path,
      'required_role', _required_role,
      'user_role', _user_role
    )
  );
END;
$$;

-- ─────────── FUNCTION: public.log_rls_denial ───────────
CREATE OR REPLACE FUNCTION public.log_rls_denial(p_table_name text, p_operation text, p_endpoint text DEFAULT NULL::text, p_query_summary text DEFAULT NULL::text, p_target_id uuid DEFAULT NULL::uuid, p_target_seller_id uuid DEFAULT NULL::uuid, p_policy_hint text DEFAULT NULL::text, p_error_code text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_role TEXT;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_operation NOT IN ('SELECT','INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION 'invalid_operation';
  END IF;

  -- enriquece com email + papel principal (best-effort)
  SELECT email, role INTO v_email, v_role
  FROM public.profiles
  WHERE user_id = v_uid
  LIMIT 1;

  INSERT INTO public.rls_denial_log (
    user_id, user_email, user_role, table_name, operation,
    endpoint, query_summary, target_id, target_seller_id,
    policy_hint, error_code, error_message, user_agent
  ) VALUES (
    v_uid, v_email, v_role, p_table_name, p_operation,
    p_endpoint, p_query_summary, p_target_id, p_target_seller_id,
    p_policy_hint, p_error_code, p_error_message, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─────────── FUNCTION: public.log_user_logout ───────────
CREATE OR REPLACE FUNCTION public.log_user_logout() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    user_id,
    action,
    resource_type,
    status,
    source,
    details
  ) VALUES (
    auth.uid(),
    'user.logout',
    'auth',
    'success',
    'client.auth',
    jsonb_build_object('timestamp', now())
  );
END;
$$;

-- ─────────── FUNCTION: public.check_hardening_status ───────────
CREATE OR REPLACE FUNCTION public.check_hardening_status() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _is_admin boolean;
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;

  RETURN jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'private_buckets_ok', _private_buckets = 4,
    'sensitive_realtime_count', _sensitive_realtime,
    'realtime_isolation_ok', _sensitive_realtime = 0,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true,
    'checked_at', now()
  );
END;
$$;

COMMIT;