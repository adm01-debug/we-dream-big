-- 1. Coluna para armazenar a cobertura RLS no relatório
ALTER TABLE public.ownership_audit_reports
  ADD COLUMN IF NOT EXISTS rls_coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rls_gaps_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ownership_audit_reports.rls_coverage IS
  'Lista de tabelas críticas (com seller_id/user_id/owner_id/created_by/assigned_to) e quais operações SELECT/INSERT/UPDATE/DELETE não possuem política RLS.';
COMMENT ON COLUMN public.ownership_audit_reports.rls_gaps_count IS
  'Total de operações sem política RLS somadas em todas as tabelas críticas.';

-- 2. Função read-only que computa a cobertura RLS atual
CREATE OR REPLACE FUNCTION public.audit_rls_coverage()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.audit_rls_coverage() FROM public;
GRANT EXECUTE ON FUNCTION public.audit_rls_coverage() TO authenticated, service_role;

-- 3. Atualiza a função principal para gravar rls_coverage no relatório
CREATE OR REPLACE FUNCTION public.audit_ownership_orphans(_triggered_by text DEFAULT 'manual'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_started_at timestamptz := clock_timestamp();
  v_report_id uuid;
  v_owner_columns text[] := ARRAY['seller_id', 'user_id', 'owner_id', 'created_by'];
  v_table record;
  v_col text;
  v_null_count bigint;
  v_orphan_count bigint;
  v_total_null bigint := 0;
  v_total_orphan bigint := 0;
  v_tables_scanned int := 0;
  v_details jsonb := '[]'::jsonb;
  v_table_entry jsonb;
  v_rls jsonb;
  v_rls_gaps int := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role))
  THEN
    RAISE EXCEPTION 'audit_ownership_orphans: acesso negado';
  END IF;

  FOR v_table IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = ANY(v_owner_columns)
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN (
        'login_attempts','step_up_audit_log','search_analytics',
        'query_telemetry','mcp_access_violations','product_views',
        'quote_history','optimization_queue','kit_templates'
      )
    ORDER BY c.table_name
  LOOP
    v_col := v_table.column_name;
    v_tables_scanned := v_tables_scanned + 1;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL',
      v_table.table_name, v_col) INTO v_null_count;

    EXECUTE format(
      'SELECT count(*) FROM public.%I t
        WHERE t.%I IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I::uuid)',
      v_table.table_name, v_col, v_col
    ) INTO v_orphan_count;

    IF v_null_count > 0 OR v_orphan_count > 0 THEN
      v_table_entry := jsonb_build_object(
        'table', v_table.table_name,
        'owner_column', v_col,
        'null_owner_count', v_null_count,
        'missing_user_count', v_orphan_count
      );
      v_details := v_details || v_table_entry;
    END IF;

    v_total_null := v_total_null + v_null_count;
    v_total_orphan := v_total_orphan + v_orphan_count;
  END LOOP;

  -- Cobertura RLS das tabelas críticas
  v_rls := public.audit_rls_coverage();
  SELECT COALESCE(SUM(jsonb_array_length(elem->'missing_ops')),0)::int
    INTO v_rls_gaps
  FROM jsonb_array_elements(v_rls) elem;

  INSERT INTO public.ownership_audit_reports (
    total_tables_scanned, total_issues_found,
    null_owner_count, missing_user_count, details,
    triggered_by, duration_ms,
    rls_coverage, rls_gaps_count
  ) VALUES (
    v_tables_scanned,
    (v_total_null + v_total_orphan)::int,
    v_total_null::int,
    v_total_orphan::int,
    v_details,
    coalesce(_triggered_by, 'manual'),
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started_at))::int,
    v_rls,
    v_rls_gaps
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$function$;