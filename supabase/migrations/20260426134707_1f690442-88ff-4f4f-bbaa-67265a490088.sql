-- ─── Tabela de relatórios ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ownership_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  total_tables_scanned integer NOT NULL DEFAULT 0,
  total_issues_found integer NOT NULL DEFAULT 0,
  null_owner_count integer NOT NULL DEFAULT 0,
  missing_user_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron',
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS idx_ownership_audit_reports_generated_at
  ON public.ownership_audit_reports(generated_at DESC);

ALTER TABLE public.ownership_audit_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ownership_audit_reports' AND policyname = 'ownership_audit_reports_admin_select') THEN
    CREATE POLICY "ownership_audit_reports_admin_select"
      ON public.ownership_audit_reports FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ownership_audit_reports' AND policyname = 'ownership_audit_reports_admin_insert') THEN
    CREATE POLICY "ownership_audit_reports_admin_insert"
      ON public.ownership_audit_reports FOR INSERT
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ownership_audit_reports' AND policyname = 'ownership_audit_reports_admin_delete') THEN
    CREATE POLICY "ownership_audit_reports_admin_delete"
      ON public.ownership_audit_reports FOR DELETE
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));
  END IF;
END $$;

-- ─── Função de auditoria ─────────────────────────────────────────────────
-- Varre tabelas em public.* com colunas de dono conhecidas (seller_id,
-- user_id, owner_id, created_by) e devolve estatísticas:
--   - registros com coluna de dono NULL
--   - registros cujo dono não existe em auth.users
-- Retorna o uuid do relatório gerado.
CREATE OR REPLACE FUNCTION public.audit_ownership_orphans(_triggered_by text DEFAULT 'manual')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
  -- Apenas admin/dev pode invocar manualmente. Cron usa service_role e bypassa.
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
      -- ignora tabelas de telemetria/log onde NULL é esperado
      AND c.table_name NOT IN (
        'login_attempts','step_up_audit_log','search_analytics',
        'query_telemetry','mcp_access_violations','product_views',
        'quote_history','optimization_queue','kit_templates'
      )
    ORDER BY c.table_name
  LOOP
    v_col := v_table.column_name;
    v_tables_scanned := v_tables_scanned + 1;

    -- 1) Registros com dono NULL
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NULL',
      v_table.table_name, v_col
    ) INTO v_null_count;

    -- 2) Registros cujo dono não existe mais em auth.users
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

  INSERT INTO public.ownership_audit_reports (
    total_tables_scanned, total_issues_found,
    null_owner_count, missing_user_count, details,
    triggered_by, duration_ms
  ) VALUES (
    v_tables_scanned,
    (v_total_null + v_total_orphan)::int,
    v_total_null::int,
    v_total_orphan::int,
    v_details,
    coalesce(_triggered_by, 'manual'),
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started_at))::int
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Permite que admins/dev invoquem; service_role do cron já tem acesso direto.
REVOKE ALL ON FUNCTION public.audit_ownership_orphans(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_ownership_orphans(text) TO authenticated, service_role;