-- 1. Backfill: admin -> supervisor (preserva dev se já existir)
-- Insere supervisor para todos que têm admin e ainda não têm supervisor
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'supervisor'::public.app_role
FROM public.user_roles ur
WHERE ur.role = 'admin'::public.app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'supervisor'::public.app_role
  );

-- Remove o papel admin (agora redundante, supervisor cobre)
DELETE FROM public.user_roles WHERE role = 'admin'::public.app_role;

-- 2. Funções de verificação (idempotente, recria com search_path seguro)
CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'::public.app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('dev'::public.app_role, 'supervisor'::public.app_role)
  )
$$;

-- 3. Alias de compatibilidade: is_admin agora cobre dev OR supervisor
-- (mantém todas as 108 policies legadas funcionando após o backfill)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(_user_id)
$$;

-- 4. has_role: garantir que has_role(uid,'admin') também resolva durante a transição
-- Como removemos linhas admin, has_role(uid,'admin') retornaria false e quebraria policies.
-- Substituímos por uma versão que trata 'admin' como sinônimo de supervisor_or_above.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'admin'::public.app_role
      THEN public.is_supervisor_or_above(_user_id)
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END
$$;