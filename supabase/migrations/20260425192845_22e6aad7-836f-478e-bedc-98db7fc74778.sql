-- Substitui a policy ALL por policies separadas, removendo INSERT do cliente.
-- A emissão passa a ser exclusiva da edge function mcp-keys-issue (service_role).
DROP POLICY IF EXISTS "Admins manage mcp_api_keys" ON public.mcp_api_keys;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Admins read mcp_api_keys') THEN
    CREATE POLICY "Admins read mcp_api_keys"
      ON public.mcp_api_keys
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Admins update mcp_api_keys') THEN
    CREATE POLICY "Admins update mcp_api_keys"
      ON public.mcp_api_keys
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Admins delete mcp_api_keys') THEN
    CREATE POLICY "Admins delete mcp_api_keys"
      ON public.mcp_api_keys
      FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Sem CREATE POLICY ... FOR INSERT: clientes autenticados não podem mais
-- inserir diretamente, fechando o vetor de XSS/sessão sequestrada.