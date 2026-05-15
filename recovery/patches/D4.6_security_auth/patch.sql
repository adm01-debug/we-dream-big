-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.6 Security/Auth Rate Limit (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: request_rate_limits ───
--

CREATE TABLE public.request_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_rate_limits_blocked_until ON public.request_rate_limits USING btree (blocked_until) WHERE (blocked_until IS NOT NULL);


--
--

CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint ON public.request_rate_limits USING btree (identifier, endpoint);


--
--

CREATE INDEX idx_rate_limits_window_start ON public.request_rate_limits USING btree (window_start);


--

--

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Devs can read rate limits" ON public.request_rate_limits FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
--

CREATE POLICY "Service role can manage rate limits" ON public.request_rate_limits TO service_role USING (true) WITH CHECK (true);


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.6 Security/Auth Rate Limit (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Function: audit_rls_coverage() ───
--

CREATE FUNCTION public.audit_rls_coverage() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH t AS (
    SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  ),
  cols AS (
    SELECT table_schema, table_name,
      bool_or(column_name IN ('seller_id','user_id','owner_id','created_by','assigned_to')) AS is_owned
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_schema, table_name
  ),
  pol AS (
    SELECT schemaname AS schema, tablename AS table_name,
      bool_or(cmd IN ('SELECT','ALL')) AS has_select,
      bool_or(cmd IN ('INSERT','ALL')) AS has_insert,
      bool_or(cmd IN ('UPDATE','ALL')) AS has_update,
      bool_or(cmd IN ('DELETE','ALL')) AS has_delete,
      count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ),
  base AS (
    SELECT t.table_name, t.rls_enabled,
      COALESCE(pol.has_select,false) AS has_select,
      COALESCE(pol.has_insert,false) AS has_insert,
      COALESCE(pol.has_update,false) AS has_update,
      COALESCE(pol.has_delete,false) AS has_delete,
      COALESCE(pol.policy_count,0) AS policy_count
    FROM t
    JOIN cols ON cols.table_schema = t.schema AND cols.table_name = t.table_name AND cols.is_owned
    LEFT JOIN pol ON pol.schema = t.schema AND pol.table_name = t.table_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', table_name,
    'rls_enabled', rls_enabled,
    'policy_count', policy_count,
    'has_select', has_select,
    'has_insert', has_insert,
    'has_update', has_update,
    'has_delete', has_delete,
    'missing_ops', (
      ARRAY_REMOVE(ARRAY[
        CASE WHEN NOT has_select THEN 'SELECT' END,
        CASE WHEN NOT has_insert THEN 'INSERT' END,
        CASE WHEN NOT has_update THEN 'UPDATE' END,
        CASE WHEN NOT has_delete THEN 'DELETE' END
      ], NULL)
    ),
    'severity', CASE
      WHEN NOT rls_enabled THEN 'critical'
      WHEN NOT has_select THEN 'high'
      WHEN (NOT has_insert) OR (NOT has_update) OR (NOT has_delete) THEN 'medium'
      ELSE 'ok'
    END
  ) ORDER BY
    (NOT rls_enabled) DESC,
    (NOT has_select) DESC,
    table_name
  ), '[]'::jsonb)
  FROM base
  WHERE NOT rls_enabled
     OR NOT has_select OR NOT has_insert OR NOT has_update OR NOT has_delete;
$$;


--

-- ─── Function: audit_rls_matrix() ───
--

CREATE FUNCTION public.audit_rls_matrix() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role))
  THEN
    RAISE EXCEPTION 'audit_rls_matrix: acesso negado';
  END IF;

  WITH crit_tables AS (
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('seller_id','user_id','owner_id','created_by','assigned_to')
  ),
  rls AS (
    SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  ),
  ops AS (
    SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS op
  ),
  pol_per_op AS (
    -- Expande policies "ALL" para as 4 operações
    SELECT p.tablename, op.op AS cmd,
           p.policyname, p.qual, p.with_check, p.permissive, p.roles
    FROM pg_policies p
    CROSS JOIN ops op
    WHERE p.schemaname = 'public'
      AND (p.cmd = op.op OR p.cmd = 'ALL')
  ),
  agg AS (
    SELECT tablename, cmd,
      jsonb_agg(jsonb_build_object(
        'name', policyname,
        'qual', COALESCE(qual::text,''),
        'with_check', COALESCE(with_check::text,''),
        'permissive', permissive,
        'roles', roles
      ) ORDER BY policyname) AS policies,
      string_agg(DISTINCT COALESCE(qual::text,''), ' || ' ORDER BY COALESCE(qual::text,'')) AS quals_concat
    FROM pol_per_op
    GROUP BY tablename, cmd
  ),
  matrix AS (
    SELECT
      t.table_name,
      r.rls_enabled,
      o.op,
      a.policies,
      a.quals_concat,
      (a.policies IS NULL) AS missing
    FROM crit_tables t
    LEFT JOIN rls r ON r.table_name = t.table_name
    CROSS JOIN ops o
    LEFT JOIN agg a ON a.tablename = t.table_name AND a.cmd = o.op
  ),
  -- Detecta divergência: o predicado de SELECT é diferente do de UPDATE/DELETE
  divergence AS (
    SELECT m.table_name,
      max(m.quals_concat) FILTER (WHERE m.op = 'SELECT') AS sel_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'UPDATE') AS upd_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'DELETE') AS del_q
    FROM matrix m
    GROUP BY m.table_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', m.table_name,
    'rls_enabled', COALESCE(m.rls_enabled,false),
    'operation', m.op,
    'missing', m.missing,
    'policy_count', COALESCE(jsonb_array_length(m.policies),0),
    'policies', COALESCE(m.policies,'[]'::jsonb),
    'criterion_diverges',
      CASE
        WHEN m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q THEN true
        WHEN m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q THEN true
        ELSE false
      END,
    'severity',
      CASE
        WHEN NOT COALESCE(m.rls_enabled,false) THEN 'critical'
        WHEN m.missing AND m.op = 'SELECT' THEN 'high'
        WHEN m.missing THEN 'medium'
        WHEN ((m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q)
           OR (m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q)) THEN 'review'
        ELSE 'ok'
      END
  ) ORDER BY m.table_name,
       CASE m.op WHEN 'SELECT' THEN 1 WHEN 'INSERT' THEN 2 WHEN 'UPDATE' THEN 3 ELSE 4 END
  ), '[]'::jsonb)
  INTO v_result
  FROM matrix m
  LEFT JOIN divergence d ON d.table_name = m.table_name;

  RETURN v_result;
END;
$$;


--

-- ─── Function: audit_user_role_changes() ───
--

CREATE FUNCTION public.audit_user_role_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _actor uuid := auth.uid();
  _action text;
  _target uuid;
  _old_role text;
  _new_role text;
  _details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'role.granted';
    _target := NEW.user_id;
    _old_role := NULL;
    _new_role := NEW.role::text;
  ELSIF TG_OP = 'UPDATE' THEN
    -- só audita se a role mudou
    IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
      RETURN NEW;
    END IF;
    _action := 'role.changed';
    _target := NEW.user_id;
    _old_role := OLD.role::text;
    _new_role := NEW.role::text;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'role.revoked';
    _target := OLD.user_id;
    _old_role := OLD.role::text;
    _new_role := NULL;
  ELSE
    RETURN NULL;
  END IF;

  _details := jsonb_build_object(
    'target_user_id', _target,
    'old_role', _old_role,
    'new_role', _new_role,
    'op', TG_OP,
    -- 'system' quando não há ator JWT (trigger por service_role/migration/edge function sem contexto)
    'source', CASE WHEN _actor IS NULL THEN 'system' ELSE 'authenticated' END
  );

  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, details, source, created_at
  ) VALUES (
    COALESCE(_actor, _target),
    _action,
    'user_role',
    _target::text,
    _details,
    CASE WHEN _actor IS NULL THEN 'system' ELSE 'database_trigger' END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- nunca bloqueia a operação principal por falha no log
  RAISE WARNING 'audit_user_role_changes failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--

-- ─── Function: audit_security_definer_acl() ───
--

CREATE FUNCTION public.audit_security_definer_acl() RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  WITH defs AS (
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proacl,
      (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
      -- whitelist de funções intencionalmente acessíveis a anon
      (p.proname IN ('submit_quote_response', 'get_quote_token_by_value')) AS public_intent
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT
      d.proname,
      d.args,
      d.is_trigger,
      d.public_intent,
      a.grantee::regrole::text AS grantee
    FROM defs d
    LEFT JOIN LATERAL (
      SELECT (aclexplode(d.proacl)).grantee
    ) a ON true
    WHERE a.grantee IS NOT NULL
  )
  -- Caso 1: PUBLIC (grantee 0) — sempre proibido
  SELECT proname, args, 'PUBLIC has EXECUTE'::text, 'PUBLIC'::text
  FROM acl_expanded
  WHERE grantee = '-'
  UNION ALL
  -- Caso 2: anon — proibido exceto whitelist
  SELECT proname, args, 'anon has EXECUTE (not in public-intent whitelist)'::text, 'anon'
  FROM acl_expanded
  WHERE grantee = 'anon' AND NOT public_intent
  UNION ALL
  -- Caso 3: authenticated em trigger function — não faz sentido
  SELECT proname, args, 'trigger function has EXECUTE for authenticated'::text, 'authenticated'
  FROM acl_expanded
  WHERE grantee = 'authenticated' AND is_trigger
  ORDER BY 1, 2;
$$;


--

-- ─── Function: _can_act_on_behalf_of_others() ───
--

CREATE FUNCTION public._can_act_on_behalf_of_others() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    auth.uid() IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR public.has_role(auth.uid(), 'dev'::app_role)
$$;


--

COMMIT;
