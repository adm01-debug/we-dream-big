-- Helpers semânticos de RBAC.
-- Toda função é STABLE + SECURITY DEFINER + search_path fixo, alinhada com
-- as funções existentes (`is_supervisor_or_above`, `is_dev`).
-- Servem como fonte única de verdade para futuras policies de telemetria,
-- logs e conexões — proibindo regressão para `has_role(...,'admin')`.

-- 1) Auditoria interna (apenas dev)
CREATE OR REPLACE FUNCTION public.can_view_audit_logs(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_dev(_user_id)
$$;

COMMENT ON FUNCTION public.can_view_audit_logs(uuid) IS
  'Permite leitura de logs de auditoria interna (admin_audit_log). Restrito ao papel dev.';

-- 2) Telemetria, logs operacionais e quotas (supervisor+)
CREATE OR REPLACE FUNCTION public.can_view_telemetry(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_supervisor_or_above(_user_id)
$$;

COMMENT ON FUNCTION public.can_view_telemetry(uuid) IS
  'Permite leitura de telemetria, logs de IA, quotas e logs de detecção de bots. Inclui dev, supervisor, admin (legado) e manager (legado).';

-- 3) Leitura de conexões / credenciais (supervisor+)
CREATE OR REPLACE FUNCTION public.can_view_connections(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_supervisor_or_above(_user_id)
$$;

COMMENT ON FUNCTION public.can_view_connections(uuid) IS
  'Permite leitura de credenciais de integração, webhooks e controle de IP. Inclui dev, supervisor, admin (legado) e manager (legado).';

-- 4) Gestão de conexões / credenciais (supervisor+)
CREATE OR REPLACE FUNCTION public.can_manage_connections(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_supervisor_or_above(_user_id)
$$;

COMMENT ON FUNCTION public.can_manage_connections(uuid) IS
  'Permite criar/alterar/excluir credenciais de integração, webhooks e controle de IP. Mesma alçada que can_view_connections.';

-- Concede execução para roles autenticadas (default seria public, mas
-- explicitar evita surpresas com revogações futuras).
GRANT EXECUTE ON FUNCTION public.can_view_audit_logs(uuid)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_telemetry(uuid)    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_connections(uuid)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_connections(uuid) TO authenticated, anon;