-- Restringir telemetria, logs e MCP apenas ao papel `dev`
-- Substitui has_role(uid, 'admin') (hoje = is_supervisor_or_above) por is_dev(uid)

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'Devs can read audit logs') THEN
    CREATE POLICY "Devs can read audit logs"
      ON public.admin_audit_log FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- connection_test_history
DROP POLICY IF EXISTS "Admins read connection_test_history" ON public.connection_test_history;
DROP POLICY IF EXISTS "Admins delete connection_test_history" ON public.connection_test_history;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connection_test_history' AND policyname = 'Devs read connection_test_history') THEN
    CREATE POLICY "Devs read connection_test_history"
      ON public.connection_test_history FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connection_test_history' AND policyname = 'Devs delete connection_test_history') THEN
    CREATE POLICY "Devs delete connection_test_history"
      ON public.connection_test_history FOR DELETE TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- external_connections
DROP POLICY IF EXISTS "Admins manage external_connections" ON public.external_connections;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'external_connections' AND policyname = 'Devs manage external_connections') THEN
    CREATE POLICY "Devs manage external_connections"
      ON public.external_connections FOR ALL TO authenticated
      USING (public.is_dev(auth.uid()))
      WITH CHECK (public.is_dev(auth.uid()));
  END IF;
END $$;

-- hardening_health_snapshots
DROP POLICY IF EXISTS "Admins read hardening snapshots" ON public.hardening_health_snapshots;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hardening_health_snapshots' AND policyname = 'Devs read hardening snapshots') THEN
    CREATE POLICY "Devs read hardening snapshots"
      ON public.hardening_health_snapshots FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- mcp_api_keys
DROP POLICY IF EXISTS "Devs and supervisors read mcp_api_keys" ON public.mcp_api_keys;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Devs read mcp_api_keys') THEN
    CREATE POLICY "Devs read mcp_api_keys"
      ON public.mcp_api_keys FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- mcp_full_grantors
DROP POLICY IF EXISTS "Admins manage mcp_full_grantors" ON public.mcp_full_grantors;
DROP POLICY IF EXISTS "Admins read mcp_full_grantors" ON public.mcp_full_grantors;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'Devs manage mcp_full_grantors') THEN
    CREATE POLICY "Devs manage mcp_full_grantors"
      ON public.mcp_full_grantors FOR ALL TO authenticated
      USING (public.is_dev(auth.uid()))
      WITH CHECK (public.is_dev(auth.uid()));
  END IF;
END $$;

-- query_telemetry
DROP POLICY IF EXISTS "Admins can read telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Admins can delete telemetry" ON public.query_telemetry;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_telemetry' AND policyname = 'Devs can read telemetry') THEN
    CREATE POLICY "Devs can read telemetry"
      ON public.query_telemetry FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_telemetry' AND policyname = 'Devs can delete telemetry') THEN
    CREATE POLICY "Devs can delete telemetry"
      ON public.query_telemetry FOR DELETE TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- secret_rotation_log
DROP POLICY IF EXISTS "Admins read secret_rotation_log" ON public.secret_rotation_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'secret_rotation_log' AND policyname = 'Devs read secret_rotation_log') THEN
    CREATE POLICY "Devs read secret_rotation_log"
      ON public.secret_rotation_log FOR SELECT TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;