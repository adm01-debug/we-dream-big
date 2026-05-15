-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.3_ownership_audit - RPCs follow-up post merge
-- 1 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: repair_ownership_orphans(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.repair_ownership_orphans(_report_id uuid DEFAULT NULL::uuid, _dry_run boolean DEFAULT true, _triggered_by_label text DEFAULT 'manual_admin'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_report record;
  v_detail jsonb;
  v_table text;
  v_col text;
  v_null_count bigint;
  v_orphan_count bigint;
  v_action text;
  v_rows int;
  v_results jsonb := '[]'::jsonb;
  v_total_deleted int := 0;
  v_total_deactivated int := 0;
  v_total_manual int := 0;
  -- Tabelas onde apagar é seguro (logs/efêmeros)
  v_safe_delete text[] := ARRAY[
    'workspace_notifications', 'rls_denial_log',
    'mcp_audit_log', 'mcp_keys_audit_log',
    'role_migration_audit', 'login_attempts'
  ];
  v_has_active boolean;
  v_has_is_active boolean;
  v_has_status boolean;
BEGIN
  -- Permissão
  IF v_caller IS NULL OR NOT (
    has_role(v_caller, 'admin'::app_role) OR has_role(v_caller, 'dev'::app_role)
  ) THEN
    RAISE EXCEPTION 'repair_ownership_orphans: acesso negado';
  END IF;

  -- Pega o relatório (último por padrão)
  IF _report_id IS NULL THEN
    SELECT * INTO v_report
    FROM public.ownership_audit_reports
    ORDER BY generated_at DESC LIMIT 1;
  ELSE
    SELECT * INTO v_report
    FROM public.ownership_audit_reports WHERE id = _report_id;
  END IF;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'repair_ownership_orphans: nenhum relatório encontrado';
  END IF;

  -- Itera detalhes
  FOR v_detail IN SELECT * FROM jsonb_array_elements(v_report.details)
  LOOP
    v_table := v_detail->>'table';
    v_col := v_detail->>'owner_column';
    v_null_count := COALESCE((v_detail->>'null_owner_count')::bigint, 0);
    v_orphan_count := COALESCE((v_detail->>'missing_user_count')::bigint, 0);

    -- Detecta colunas auxiliares disponíveis na tabela
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_table AND column_name='active')
      INTO v_has_active;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_table AND column_name='is_active')
      INTO v_has_is_active;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_table AND column_name='status')
      INTO v_has_status;

    --- (1) NULL OWNERS ---
    IF v_null_count > 0 THEN
      v_action := 'manual_review';
      v_rows := 0;

      IF v_table = ANY(v_safe_delete) THEN
        v_action := 'deleted';
        IF NOT _dry_run THEN
          EXECUTE format('DELETE FROM public.%I WHERE %I IS NULL', v_table, v_col);
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_null_count::int;
        END IF;
        v_total_deleted := v_total_deleted + v_rows;
      ELSIF v_has_is_active THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format('UPDATE public.%I SET is_active=false WHERE %I IS NULL AND is_active=true', v_table, v_col);
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_null_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSIF v_has_active THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format('UPDATE public.%I SET active=false WHERE %I IS NULL AND active=true', v_table, v_col);
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_null_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSIF v_has_status THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format(
            'UPDATE public.%I SET status=''inactive'' WHERE %I IS NULL AND status<>''inactive''',
            v_table, v_col
          );
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_null_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSE
        v_rows := v_null_count::int;
        v_total_manual := v_total_manual + v_rows;
      END IF;

      INSERT INTO public.ownership_repair_logs(
        report_id, table_name, owner_column, issue_type, action,
        rows_affected, dry_run, triggered_by, triggered_by_label,
        notes
      ) VALUES (
        v_report.id, v_table, v_col, 'null_owner', v_action,
        v_rows, _dry_run, v_caller, _triggered_by_label,
        CASE WHEN v_action='manual_review'
          THEN 'Sem coluna active/is_active/status; tabela não está na allowlist de exclusão segura'
          ELSE NULL END
      );

      v_results := v_results || jsonb_build_object(
        'table', v_table, 'owner_column', v_col,
        'issue', 'null_owner', 'action', v_action,
        'rows_affected', v_rows, 'dry_run', _dry_run
      );
    END IF;

    --- (2) MISSING USERS (órfãos) ---
    IF v_orphan_count > 0 THEN
      v_action := 'manual_review';
      v_rows := 0;

      IF v_table = ANY(v_safe_delete) THEN
        v_action := 'deleted';
        IF NOT _dry_run THEN
          EXECUTE format(
            'DELETE FROM public.%I t WHERE t.%I IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I::uuid)',
            v_table, v_col, v_col
          );
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_orphan_count::int;
        END IF;
        v_total_deleted := v_total_deleted + v_rows;
      ELSIF v_has_is_active THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format(
            'UPDATE public.%I t SET is_active=false WHERE t.%I IS NOT NULL AND t.is_active=true
              AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I::uuid)',
            v_table, v_col, v_col
          );
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_orphan_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSIF v_has_active THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format(
            'UPDATE public.%I t SET active=false WHERE t.%I IS NOT NULL AND t.active=true
              AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I::uuid)',
            v_table, v_col, v_col
          );
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_orphan_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSIF v_has_status THEN
        v_action := 'deactivated';
        IF NOT _dry_run THEN
          EXECUTE format(
            'UPDATE public.%I t SET status=''inactive'' WHERE t.%I IS NOT NULL AND t.status<>''inactive''
              AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.%I::uuid)',
            v_table, v_col, v_col
          );
          GET DIAGNOSTICS v_rows = ROW_COUNT;
        ELSE
          v_rows := v_orphan_count::int;
        END IF;
        v_total_deactivated := v_total_deactivated + v_rows;
      ELSE
        v_rows := v_orphan_count::int;
        v_total_manual := v_total_manual + v_rows;
      END IF;

      INSERT INTO public.ownership_repair_logs(
        report_id, table_name, owner_column, issue_type, action,
        rows_affected, dry_run, triggered_by, triggered_by_label,
        notes
      ) VALUES (
        v_report.id, v_table, v_col, 'missing_user', v_action,
        v_rows, _dry_run, v_caller, _triggered_by_label,
        CASE WHEN v_action='manual_review'
          THEN 'Sem coluna active/is_active/status; reparo automático inseguro — revisar manualmente'
          ELSE NULL END
      );

      v_results := v_results || jsonb_build_object(
        'table', v_table, 'owner_column', v_col,
        'issue', 'missing_user', 'action', v_action,
        'rows_affected', v_rows, 'dry_run', _dry_run
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'report_id', v_report.id,
    'dry_run', _dry_run,
    'totals', jsonb_build_object(
      'deleted', v_total_deleted,
      'deactivated', v_total_deactivated,
      'manual_review', v_total_manual
    ),
    'actions', v_results
  );
END;
$$;


--

--

COMMIT;
