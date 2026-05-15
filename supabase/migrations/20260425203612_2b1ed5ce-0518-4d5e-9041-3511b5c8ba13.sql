
-- =========================================================
-- HARDENING mcp_api_keys: FORCE RLS + policies explícitas + auditoria automática
-- =========================================================

-- 1. FORCE RLS (ninguém bypass, exceto service_role)
ALTER TABLE public.mcp_api_keys FORCE ROW LEVEL SECURITY;

-- 2. Drop policies antigas baseadas em 'admin'
DROP POLICY IF EXISTS "Admins read mcp_api_keys" ON public.mcp_api_keys;
DROP POLICY IF EXISTS "Admins delete mcp_api_keys" ON public.mcp_api_keys;

-- 3. Policies explícitas com a nova hierarquia
-- Leitura: apenas dev e supervisor (vendedor NUNCA vê chaves)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Devs and supervisors read mcp_api_keys') THEN
    CREATE POLICY "Devs and supervisors read mcp_api_keys"
      ON public.mcp_api_keys FOR SELECT
      TO authenticated
      USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- Insert: SEMPRE negado para clientes JWT (apenas service_role via edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'No direct insert via JWT') THEN
    CREATE POLICY "No direct insert via JWT"
      ON public.mcp_api_keys FOR INSERT
      TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

-- Update: SEMPRE negado para clientes JWT (apenas service_role via edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'No direct update via JWT') THEN
    CREATE POLICY "No direct update via JWT"
      ON public.mcp_api_keys FOR UPDATE
      TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- Delete: SEMPRE negado para clientes JWT (apenas service_role via edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'No direct delete via JWT') THEN
    CREATE POLICY "No direct delete via JWT"
      ON public.mcp_api_keys FOR DELETE
      TO authenticated
      USING (false);
  END IF;
END $$;

-- 4. Check constraint defensiva no formato do hash
ALTER TABLE public.mcp_api_keys
  DROP CONSTRAINT IF EXISTS mcp_api_keys_key_hash_format_chk;
ALTER TABLE public.mcp_api_keys
  ADD CONSTRAINT mcp_api_keys_key_hash_format_chk
  CHECK (length(key_hash) = 64 AND key_hash ~ '^[0-9a-f]{64}$');

-- 5. Trigger de auditoria automática para INSERT (emissão de chave)
CREATE OR REPLACE FUNCTION public.audit_mcp_key_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_full BOOLEAN := '*' = ANY(NEW.scopes);
BEGIN
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    COALESCE(NEW.created_by, auth.uid()),
    CASE WHEN _is_full THEN 'mcp_key.issued_full' ELSE 'mcp_key.issued' END,
    'mcp_api_key',
    NEW.id::text,
    jsonb_build_object(
      'name', NEW.name,
      'key_prefix', NEW.key_prefix,
      'scopes', NEW.scopes,
      'is_full_access', _is_full,
      'expires_at', NEW.expires_at,
      'created_by', NEW.created_by,
      'auto_logged', true
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_mcp_key_insert ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_audit_mcp_key_insert ON public.mcp_api_keys;
CREATE TRIGGER trg_audit_mcp_key_insert
  AFTER INSERT ON public.mcp_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_mcp_key_insert();

-- 6. Trigger de auditoria para REVOKE (UPDATE setando revoked_at)
CREATE OR REPLACE FUNCTION public.audit_mcp_key_revoke()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(),
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'name', NEW.name,
        'key_prefix', NEW.key_prefix,
        'scopes', NEW.scopes,
        'revoked_at', NEW.revoked_at,
        'auto_logged', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_mcp_key_revoke ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_audit_mcp_key_revoke ON public.mcp_api_keys;
CREATE TRIGGER trg_audit_mcp_key_revoke
  AFTER UPDATE OF revoked_at ON public.mcp_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_mcp_key_revoke();
