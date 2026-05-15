
-- ============================================================
-- Corrige RLS legada que ainda exige has_role(uid,'admin') literal
-- Após a migração da hierarquia (dev > supervisor > vendedor) ninguém
-- mais tem role 'admin' no banco — então essas policies bloqueavam
-- 100% das operações (UPDATE em user_roles, INSERT em audit log etc).
-- Trocamos por is_supervisor_or_above() que reconhece supervisor E dev
-- (e ainda inclui 'admin' legado por compatibilidade).
-- ============================================================

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Supervisors can manage roles') THEN
    CREATE POLICY "Supervisors can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.is_supervisor_or_above(auth.uid()))
    WITH CHECK (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can insert audit entries" ON public.admin_audit_log;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'Supervisors can insert audit entries') THEN
    CREATE POLICY "Supervisors can insert audit entries"
    ON public.admin_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;
