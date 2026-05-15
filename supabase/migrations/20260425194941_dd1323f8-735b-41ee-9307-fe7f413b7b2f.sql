-- 1. Índice para acelerar drawer + feed de auditoria
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource_lookup
  ON public.admin_audit_log (resource_type, resource_id, created_at DESC);

-- 2. Função util: extrai ator com fallbacks
CREATE OR REPLACE FUNCTION public.mcp_audit_actor(_fallback uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_sub text;
  header_actor text;
BEGIN
  -- Header customizado setado pelas edge functions (set_config('request.jwt.claim.sub', ...))
  BEGIN
    header_actor := current_setting('request.mcp_actor', true);
  EXCEPTION WHEN OTHERS THEN
    header_actor := NULL;
  END;
  IF header_actor IS NOT NULL AND header_actor <> '' THEN
    RETURN header_actor::uuid;
  END IF;

  -- JWT padrão Supabase
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;

  BEGIN
    jwt_sub := current_setting('request.jwt.claims', true)::jsonb->>'sub';
  EXCEPTION WHEN OTHERS THEN
    jwt_sub := NULL;
  END;
  IF jwt_sub IS NOT NULL AND jwt_sub <> '' THEN
    RETURN jwt_sub::uuid;
  END IF;

  RETURN _fallback;
END;
$$;

-- 3. Trigger unificado (substitui o antigo de revogação)
CREATE OR REPLACE FUNCTION public.log_mcp_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  changed jsonb := '{}'::jsonb;
  fields text[] := ARRAY[]::text[];
  was_full boolean;
  is_now_full boolean;
  escalated boolean := false;
BEGIN
  actor := public.mcp_audit_actor(NEW.created_by);

  -- Caso 1: revogação (NULL -> NOT NULL)
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor,
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes),
        'revoked_at', NEW.revoked_at
      )
    );
    RETURN NEW;
  END IF;

  -- Caso 2: alteração de campos sensíveis
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    fields := array_append(fields, 'name');
    changed := changed || jsonb_build_object('name', jsonb_build_object('before', OLD.name, 'after', NEW.name));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    fields := array_append(fields, 'description');
    changed := changed || jsonb_build_object('description', jsonb_build_object('before', OLD.description, 'after', NEW.description));
  END IF;
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    fields := array_append(fields, 'expires_at');
    changed := changed || jsonb_build_object('expires_at', jsonb_build_object('before', OLD.expires_at, 'after', NEW.expires_at));
  END IF;
  IF NEW.scopes IS DISTINCT FROM OLD.scopes THEN
    fields := array_append(fields, 'scopes');
    changed := changed || jsonb_build_object('scopes', jsonb_build_object('before', OLD.scopes, 'after', NEW.scopes));
    was_full := '*' = ANY(COALESCE(OLD.scopes, ARRAY[]::text[]));
    is_now_full := '*' = ANY(COALESCE(NEW.scopes, ARRAY[]::text[]));
    IF NOT was_full AND is_now_full THEN
      escalated := true;
    END IF;
  END IF;

  IF array_length(fields, 1) IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      actor,
      'mcp_key.updated',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix,
        'name', NEW.name,
        'fields_changed', fields,
        'diff', changed,
        'escalated_to_full', escalated
      )
    );

    IF escalated THEN
      INSERT INTO public.admin_audit_log (
        user_id, action, resource_type, resource_id, details
      ) VALUES (
        actor,
        'mcp_key.scope_escalated',
        'mcp_api_key',
        NEW.id::text,
        jsonb_build_object(
          'key_prefix', NEW.key_prefix,
          'name', NEW.name,
          'before_scopes', OLD.scopes,
          'after_scopes', NEW.scopes
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Substitui trigger antigo
DROP TRIGGER IF EXISTS trg_log_mcp_key_revocation ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_log_mcp_key_changes ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_log_mcp_key_changes ON public.mcp_api_keys;
CREATE TRIGGER trg_log_mcp_key_changes
  AFTER UPDATE ON public.mcp_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_mcp_key_changes();

-- 5. RLS: bloqueia UPDATE direto (apenas service_role pode mexer)
DROP POLICY IF EXISTS "Admins update mcp_api_keys" ON public.mcp_api_keys;

-- Continua permitindo SELECT por admins (já existia "Admins read mcp_api_keys")
-- DELETE permanece com a policy original.
-- Updates passam exclusivamente pelas edge functions com service_role.