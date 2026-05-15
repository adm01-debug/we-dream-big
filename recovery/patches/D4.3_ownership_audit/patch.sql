-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.3 Ownership Audit (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: ownership_audit_reports ───
--

CREATE TABLE public.ownership_audit_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_tables_scanned integer DEFAULT 0 NOT NULL,
    total_issues_found integer DEFAULT 0 NOT NULL,
    null_owner_count integer DEFAULT 0 NOT NULL,
    missing_user_count integer DEFAULT 0 NOT NULL,
    details jsonb DEFAULT '[]'::jsonb NOT NULL,
    triggered_by text DEFAULT 'cron'::text NOT NULL,
    duration_ms integer,
    rls_coverage jsonb DEFAULT '[]'::jsonb NOT NULL,
    rls_gaps_count integer DEFAULT 0 NOT NULL
);


--

--

CREATE INDEX idx_ownership_audit_reports_generated_at ON public.ownership_audit_reports USING btree (generated_at DESC);


--

--

ALTER TABLE public.ownership_audit_reports ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY ownership_audit_reports_admin_delete ON public.ownership_audit_reports FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
--

CREATE POLICY ownership_audit_reports_admin_insert ON public.ownership_audit_reports FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
--

CREATE POLICY ownership_audit_reports_admin_select ON public.ownership_audit_reports FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--

-- ─── Table: ownership_repair_logs ───
--

CREATE TABLE public.ownership_repair_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid,
    table_name text NOT NULL,
    owner_column text NOT NULL,
    issue_type text NOT NULL,
    action text NOT NULL,
    rows_affected integer DEFAULT 0 NOT NULL,
    dry_run boolean DEFAULT true NOT NULL,
    triggered_by uuid,
    triggered_by_label text,
    notes text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ownership_repair_logs_action_check CHECK ((action = ANY (ARRAY['deleted'::text, 'deactivated'::text, 'manual_review'::text, 'skipped'::text, 'failed'::text]))),
    CONSTRAINT ownership_repair_logs_issue_type_check CHECK ((issue_type = ANY (ARRAY['null_owner'::text, 'missing_user'::text])))
);


--

--

CREATE INDEX idx_ownership_repair_logs_created_at ON public.ownership_repair_logs USING btree (created_at DESC);


--
--

CREATE INDEX idx_ownership_repair_logs_report ON public.ownership_repair_logs USING btree (report_id);


--

--

ALTER TABLE public.ownership_repair_logs ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins/devs read repair logs" ON public.ownership_repair_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.3 Ownership Audit (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Function: audit_ownership_orphans(text) ───
--

CREATE FUNCTION public.audit_ownership_orphans(_triggered_by text DEFAULT 'manual'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--

COMMIT;
