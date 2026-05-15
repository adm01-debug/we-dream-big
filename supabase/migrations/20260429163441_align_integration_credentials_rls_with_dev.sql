-- ============================================================================
-- Alinha RLS de integration_credentials com a regra real de permissão
-- ----------------------------------------------------------------------------
-- A edge function secrets-manager autoriza role 'dev' (não admin), mas as
-- policies da tabela exigem 'admin'. Como secrets-manager usa service_role
-- (que ignora RLS) o fluxo via UI funciona, mas:
--   1. Auditoria e ferramentas de policy-checker mostram divergência;
--   2. Acesso direto via SQL editor com role 'dev' falha silenciosamente;
--   3. Realtime pode bloquear payloads para subscriptors 'dev'.
--
-- Este patch:
--   - Faz drop das 4 policies antigas (admin-only)
--   - Recria como FOR ALL com USING/WITH CHECK aceitando admin OU dev
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view integration credentials"
  ON public.integration_credentials;
DROP POLICY IF EXISTS "Admins can insert integration credentials"
  ON public.integration_credentials;
DROP POLICY IF EXISTS "Admins can update integration credentials"
  ON public.integration_credentials;
DROP POLICY IF EXISTS "Admins can delete integration credentials"
  ON public.integration_credentials;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins and devs can view integration credentials') THEN
    CREATE POLICY "Admins and devs can view integration credentials"
      ON public.integration_credentials
      FOR SELECT
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dev'::public.app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins and devs can insert integration credentials') THEN
    CREATE POLICY "Admins and devs can insert integration credentials"
      ON public.integration_credentials
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dev'::public.app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins and devs can update integration credentials') THEN
    CREATE POLICY "Admins and devs can update integration credentials"
      ON public.integration_credentials
      FOR UPDATE
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dev'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dev'::public.app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins and devs can delete integration credentials') THEN
    CREATE POLICY "Admins and devs can delete integration credentials"
      ON public.integration_credentials
      FOR DELETE
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dev'::public.app_role)
      );
  END IF;
END $$;
