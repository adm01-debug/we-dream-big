-- ============================================================
-- Hardening: rotas técnicas (telemetria/segurança) → only dev
-- Alinha RLS com o RBAC do frontend (devOnly).
-- Edge functions usam service_role e continuam funcionando.
-- ============================================================

-- optimization_queue: era admin → dev
DROP POLICY IF EXISTS "Admins manage optimization queue" ON public.optimization_queue;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'optimization_queue' AND policyname = 'Devs manage optimization queue') THEN
    CREATE POLICY "Devs manage optimization queue"
      ON public.optimization_queue
      FOR ALL
      TO authenticated
      USING (public.is_dev(auth.uid()))
      WITH CHECK (public.is_dev(auth.uid()));
  END IF;
END $$;

-- bot_detection_log: SELECT era admin → dev (INSERT continua service_role)
DROP POLICY IF EXISTS "Admins can read bot log" ON public.bot_detection_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_detection_log' AND policyname = 'Devs can read bot log') THEN
    CREATE POLICY "Devs can read bot log"
      ON public.bot_detection_log
      FOR SELECT
      TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- ip_access_control: ALL era admin → dev (service_role policy permanece)
DROP POLICY IF EXISTS "Admins can manage ip_access_control" ON public.ip_access_control;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ip_access_control' AND policyname = 'Devs can manage ip_access_control') THEN
    CREATE POLICY "Devs can manage ip_access_control"
      ON public.ip_access_control
      FOR ALL
      TO authenticated
      USING (public.is_dev(auth.uid()))
      WITH CHECK (public.is_dev(auth.uid()));
  END IF;
END $$;

-- request_rate_limits: SELECT era admin → dev
DROP POLICY IF EXISTS "Admins can read rate limits" ON public.request_rate_limits;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'request_rate_limits' AND policyname = 'Devs can read rate limits') THEN
    CREATE POLICY "Devs can read rate limits"
      ON public.request_rate_limits
      FOR SELECT
      TO authenticated
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;