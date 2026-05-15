-- Tabela de admins autorizados a conceder escopo MCP "*" (Full Access)
CREATE TABLE IF NOT EXISTS public.mcp_full_grantors (
  user_id     uuid PRIMARY KEY,
  granted_by  uuid,
  reason      text,
  granted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_full_grantors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read mcp_full_grantors" ON public.mcp_full_grantors;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'Admins read mcp_full_grantors') THEN
    CREATE POLICY "Admins read mcp_full_grantors"
      ON public.mcp_full_grantors FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins manage mcp_full_grantors" ON public.mcp_full_grantors;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'Admins manage mcp_full_grantors') THEN
    CREATE POLICY "Admins manage mcp_full_grantors"
      ON public.mcp_full_grantors FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Função SECURITY DEFINER para checar permissão sem expor a tabela.
-- Modo bootstrap: se ninguém estiver cadastrado ainda, qualquer admin pode (compat).
CREATE OR REPLACE FUNCTION public.can_grant_mcp_full(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    AND (
      EXISTS (SELECT 1 FROM public.mcp_full_grantors WHERE user_id = _user_id)
      OR NOT EXISTS (SELECT 1 FROM public.mcp_full_grantors)  -- bootstrap
    );
$$;

COMMENT ON TABLE public.mcp_full_grantors IS 'Whitelist explícita de admins autorizados a emitir/escalar chaves MCP com escopo "*" (Full Access).';
COMMENT ON FUNCTION public.can_grant_mcp_full(uuid) IS 'Retorna true se o usuário pode conceder escopo MCP "*". Modo bootstrap: se a tabela estiver vazia, qualquer admin pode (one-time, até o primeiro insert).';