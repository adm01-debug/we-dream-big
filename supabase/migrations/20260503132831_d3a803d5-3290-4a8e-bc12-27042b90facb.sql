-- 1. admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_log_select_policy" ON public.admin_audit_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_select_policy') THEN
    CREATE POLICY "admin_audit_log_select_policy" ON public.admin_audit_log
    FOR SELECT TO authenticated
    USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- 2. ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_usage_logs_select_policy" ON public.ai_usage_logs;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_logs' AND policyname = 'ai_usage_logs_select_policy') THEN
    CREATE POLICY "ai_usage_logs_select_policy" ON public.ai_usage_logs
    FOR SELECT TO authenticated
    USING (
      auth.uid() = user_id OR
      public.is_supervisor_or_above(auth.uid())
    );
  END IF;
END $$;

-- 3. login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_select_policy" ON public.login_attempts;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_attempts' AND policyname = 'login_attempts_select_policy') THEN
    CREATE POLICY "login_attempts_select_policy" ON public.login_attempts
    FOR SELECT TO authenticated
    USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- 4. rls_denial_log (Extremely sensitive)
ALTER TABLE public.rls_denial_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_denial_log_select_policy" ON public.rls_denial_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rls_denial_log' AND policyname = 'rls_denial_log_select_policy') THEN
    CREATE POLICY "rls_denial_log_select_policy" ON public.rls_denial_log
    FOR SELECT TO authenticated
    USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;
