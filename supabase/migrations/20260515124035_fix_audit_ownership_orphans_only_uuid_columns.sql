
-- Fix: audit_ownership_orphans tentava cast ::uuid em colunas TEXT, quebrava com
-- valores como "system" em enriched_contacts.created_by. Agora só considera
-- colunas com data_type='uuid'. Mais robusto que manter blacklist.
--
-- ORIGEM: applied directly via apply_migration in another Claude session
-- on 2026-05-15. Now committed to git for migration history parity.

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
  IF auth.uid() IS NOT NULL AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'audit_ownership_orphans: acesso negado';
  END IF;

  FOR v_table IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = ANY(v_owner_columns)
      AND c.data_type = 'uuid'  -- FIX: ignora colunas TEXT como enriched_contacts.created_by ('system')
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('login_attempts','step_up_audit_log','search_analytics','query_telemetry','mcp_access_violations','product_views','quote_history','optimization_queue','kit_templates')
    ORDER BY c.table_name
  LOOP
    v_col := v_table.column_name;
    v_tables_scanned := v_tables_scanned + 1;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL', v_table.table_name, v_col) INTO v_null_count;
    EXECUTE format('SELECT count(*) FROM public.%I t WHERE t.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I)',
      v_table.table_name, v_col, v_col) INTO v_orphan_count;
    IF v_null_count > 0 OR v_orphan_count > 0 THEN
      v_table_entry := jsonb_build_object('table', v_table.table_name, 'owner_column', v_col,
        'null_owner_count', v_null_count, 'missing_user_count', v_orphan_count);
      v_details := v_details || v_table_entry;
    END IF;
    v_total_null := v_total_null + v_null_count;
    v_total_orphan := v_total_orphan + v_orphan_count;
  END LOOP;

  v_rls := public.audit_rls_coverage();
  SELECT COALESCE(SUM(jsonb_array_length(elem->'missing_ops')),0)::int INTO v_rls_gaps
  FROM jsonb_array_elements(v_rls) elem;

  INSERT INTO public.ownership_audit_reports (
    total_tables_scanned, total_issues_found, null_owner_count, missing_user_count, details,
    triggered_by, duration_ms, rls_coverage, rls_gaps_count
  ) VALUES (
    v_tables_scanned, (v_total_null + v_total_orphan)::int, v_total_null::int, v_total_orphan::int, v_details,
    coalesce(_triggered_by, 'manual'),
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started_at))::int,
    v_rls, v_rls_gaps
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$function$;

-- Comentário documental
COMMENT ON FUNCTION public.audit_ownership_orphans(text) IS
  'Audita propriedade de registros em tabelas com colunas UUID owner. Versão corrigida (15/mai/2026): ignora colunas TEXT como enriched_contacts.created_by que armazenam valores não-UUID como "system".';
