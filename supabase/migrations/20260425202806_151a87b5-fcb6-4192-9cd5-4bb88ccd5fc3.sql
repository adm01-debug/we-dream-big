-- Funções de verificação de papel
CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('dev'::public.app_role, 'supervisor'::public.app_role, 'admin'::public.app_role)
  );
$$;

-- is_admin() vira alias para "supervisor ou acima" (compatibilidade com policies legadas)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_supervisor_or_above(auth.uid());
END;
$$;

-- Conceder MCP FULL agora exige role 'dev'
CREATE OR REPLACE FUNCTION public.can_grant_mcp_full(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dev(_user_id);
$$;

-- Promove TEMPORARIAMENTE todos os admins atuais para também ter o papel 'dev'
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'dev'::public.app_role
FROM public.user_roles
WHERE role = 'admin'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- Documentação
COMMENT ON TYPE public.app_role IS 'Papéis: vendedor (padrão), supervisor (gestão comercial), dev (acesso técnico exclusivo). admin mantido como legado/alias de supervisor.';
COMMENT ON FUNCTION public.is_dev IS 'Verifica se o usuário tem o papel dev (acesso técnico: telemetria, conexões, MCP, secrets, hardening).';
COMMENT ON FUNCTION public.is_supervisor_or_above IS 'Verifica se o usuário tem ao menos o papel supervisor (inclui admin legado e dev).';