-- 1. Coluna para encadear rotações
ALTER TABLE public.mcp_api_keys
  ADD COLUMN IF NOT EXISTS rotated_from uuid
  REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_rotated_from
  ON public.mcp_api_keys(rotated_from)
  WHERE rotated_from IS NOT NULL;

-- 2. Trigger que audita revogações automaticamente
CREATE OR REPLACE FUNCTION public.log_mcp_key_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dispara apenas quando revoked_at passa de NULL para NOT NULL
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      COALESCE(auth.uid(), NEW.created_by),
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_mcp_key_revocation ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_log_mcp_key_revocation ON public.mcp_api_keys;
CREATE TRIGGER trg_log_mcp_key_revocation
  AFTER UPDATE OF revoked_at ON public.mcp_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_mcp_key_revocation();