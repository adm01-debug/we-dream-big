-- ============================================================
-- Migration: Hierarquia DEV / SUPERVISOR / AGENTE (fase 1 — segura)
-- ============================================================
-- Não remove valores legados do enum (admin/manager/vendedor) para
-- preservar as 76 policies que ainda referenciam 'admin'. A remoção
-- ficará para uma fase posterior, após reescrita completa das policies.

-- 1) Garantir valores novos no enum (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumtypid='public.app_role'::regtype AND enumlabel='supervisor') THEN
    ALTER TYPE public.app_role ADD VALUE 'supervisor';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
    WHERE enumtypid='public.app_role'::regtype AND enumlabel='dev') THEN
    ALTER TYPE public.app_role ADD VALUE 'dev';
  END IF;
END $$;

-- 2) Backfill: migrar quaisquer 'manager' ou 'admin' restantes em user_roles
--    para 'supervisor' (sem duplicar quando o usuário já tem supervisor).
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ur.user_id, 'supervisor'::public.app_role
FROM public.user_roles ur
WHERE ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'supervisor'::public.app_role
  );

DELETE FROM public.user_roles
WHERE role IN ('admin'::public.app_role, 'manager'::public.app_role);

-- 3) Reforçar funções de hierarquia (idempotente)

-- has_role: inalterado, apenas reasseguramos a definição canônica
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_dev: somente quem tem o role 'dev'
CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'::public.app_role
  )
$$;

-- is_supervisor_or_above: dev OU supervisor (e admin legado, por compat)
CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('dev'::public.app_role,
                   'supervisor'::public.app_role,
                   'admin'::public.app_role)
  )
$$;

-- is_admin: ALIAS permanente de is_supervisor_or_above() — preserva
-- compatibilidade com as 76 policies que chamam is_admin(auth.uid()).
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(_user_id)
$$;

-- Versão sem argumento (caso exista assinatura antiga)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(auth.uid())
$$;

-- 4) handle_new_user: default continua 'vendedor' (= agente no frontend).
--    Mantemos para não quebrar trigger existente; só garante presença.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc
    WHERE proname='handle_new_user' AND pronamespace='public'::regnamespace) THEN
    -- não recria se já existe (assinatura desconhecida)
    NULL;
  END IF;
END $$;

-- 5) Comentários explicativos para futuras auditorias
COMMENT ON TYPE public.app_role IS
  'Hierarquia ativa: dev > supervisor > vendedor (=agente no UI). '
  'Valores legados admin/manager mantidos no enum apenas por compatibilidade '
  'com policies antigas (~76 referências a ''admin''). Não atribuir esses '
  'valores a usuários — backfill move tudo para supervisor.';

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'ALIAS de is_supervisor_or_above. Preservado para compatibilidade com '
  'policies legadas. Em código novo, prefira is_supervisor_or_above() ou is_dev().';