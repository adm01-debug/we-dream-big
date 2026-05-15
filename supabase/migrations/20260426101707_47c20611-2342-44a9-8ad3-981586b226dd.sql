
-- =========================================================
-- Função de auditoria genérica para user_roles
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor uuid := auth.uid();
  _action text;
  _target uuid;
  _old_role text;
  _new_role text;
  _details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'role.granted';
    _target := NEW.user_id;
    _old_role := NULL;
    _new_role := NEW.role::text;
  ELSIF TG_OP = 'UPDATE' THEN
    -- só audita se a role mudou
    IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
      RETURN NEW;
    END IF;
    _action := 'role.changed';
    _target := NEW.user_id;
    _old_role := OLD.role::text;
    _new_role := NEW.role::text;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'role.revoked';
    _target := OLD.user_id;
    _old_role := OLD.role::text;
    _new_role := NULL;
  ELSE
    RETURN NULL;
  END IF;

  _details := jsonb_build_object(
    'target_user_id', _target,
    'old_role', _old_role,
    'new_role', _new_role,
    'op', TG_OP,
    -- 'system' quando não há ator JWT (trigger por service_role/migration/edge function sem contexto)
    'source', CASE WHEN _actor IS NULL THEN 'system' ELSE 'authenticated' END
  );

  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, details, source, created_at
  ) VALUES (
    COALESCE(_actor, _target),
    _action,
    'user_role',
    _target::text,
    _details,
    CASE WHEN _actor IS NULL THEN 'system' ELSE 'database_trigger' END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- nunca bloqueia a operação principal por falha no log
  RAISE WARNING 'audit_user_role_changes failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================================
-- Triggers
-- =========================================================
DROP TRIGGER IF EXISTS trg_user_roles_audit_ins ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_audit_ins ON public.user_roles;
CREATE TRIGGER trg_user_roles_audit_ins
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

DROP TRIGGER IF EXISTS trg_user_roles_audit_upd ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_audit_upd ON public.user_roles;
CREATE TRIGGER trg_user_roles_audit_upd
AFTER UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

DROP TRIGGER IF EXISTS trg_user_roles_audit_del ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_audit_del ON public.user_roles;
CREATE TRIGGER trg_user_roles_audit_del
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

-- =========================================================
-- Índice para consultas do histórico (filtra por action e ordena por data)
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_role_actions
ON public.admin_audit_log (action, created_at DESC)
WHERE action IN ('role.granted','role.changed','role.revoked','role.promote','role.demote');
