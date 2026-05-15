-- 1) Tabela de violações
CREATE TABLE IF NOT EXISTS public.mcp_access_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  operation TEXT NULL,
  target_key_id UUID NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  request_id TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_violations_created
  ON public.mcp_access_violations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_violations_user_created
  ON public.mcp_access_violations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_violations_ip_created
  ON public.mcp_access_violations (ip_address, created_at DESC);

ALTER TABLE public.mcp_access_violations ENABLE ROW LEVEL SECURITY;

-- Apenas admins leem; nenhum acesso de escrita por JWT
DROP POLICY IF EXISTS "Admins read mcp violations" ON public.mcp_access_violations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_access_violations' AND policyname = 'Admins read mcp violations') THEN
    CREATE POLICY "Admins read mcp violations"
      ON public.mcp_access_violations
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- 2) Função: dispara alerta quando threshold é atingido
CREATE OR REPLACE FUNCTION public.check_mcp_abuse_threshold(
  _user_id UUID,
  _ip TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window INTERVAL := INTERVAL '10 minutes';
  v_threshold INTEGER := 5;
  v_count_user INTEGER := 0;
  v_count_ip INTEGER := 0;
  v_admin RECORD;
  v_already_alerted BOOLEAN := false;
BEGIN
  -- Conta violações na janela
  IF _user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_user
    FROM public.mcp_access_violations
    WHERE user_id = _user_id
      AND created_at >= now() - v_window;
  END IF;

  IF _ip IS NOT NULL AND _ip <> '' THEN
    SELECT COUNT(*) INTO v_count_ip
    FROM public.mcp_access_violations
    WHERE ip_address = _ip
      AND created_at >= now() - v_window;
  END IF;

  IF v_count_user < v_threshold AND v_count_ip < v_threshold THEN
    RETURN;
  END IF;

  -- Evita disparos duplicados: se já houver alerta nos últimos 10min para mesmo user/ip, sai
  SELECT EXISTS (
    SELECT 1 FROM public.admin_audit_log
    WHERE action = 'mcp_abuse_detected'
      AND created_at >= now() - v_window
      AND (
        (details->>'user_id') = _user_id::text
        OR (details->>'ip_address') = _ip
      )
  ) INTO v_already_alerted;

  IF v_already_alerted THEN
    RETURN;
  END IF;

  -- Registra evento de auditoria
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id,
    ip_address, details, source, status
  ) VALUES (
    COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'mcp_abuse_detected',
    'mcp_api_keys',
    NULL,
    _ip,
    jsonb_build_object(
      'user_id', _user_id,
      'ip_address', _ip,
      'window_minutes', 10,
      'threshold', v_threshold,
      'violations_user', v_count_user,
      'violations_ip', v_count_ip
    ),
    'mcp_abuse_detector',
    'denied'
  );

  -- Notifica admins
  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role
  LOOP
    INSERT INTO public.workspace_notifications (
      user_id, title, message, type, category, action_url, metadata
    ) VALUES (
      v_admin.user_id,
      'Possível abuso em chaves MCP',
      format(
        'Detectadas %s tentativas bloqueadas em 10 min%s.',
        GREATEST(v_count_user, v_count_ip),
        CASE WHEN _ip IS NOT NULL THEN ' (IP: ' || _ip || ')' ELSE '' END
      ),
      'warning',
      'security',
      '/admin/seguranca',
      jsonb_build_object(
        'event', 'mcp_abuse_detected',
        'user_id', _user_id,
        'ip_address', _ip,
        'violations_user', v_count_user,
        'violations_ip', v_count_ip
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.check_mcp_abuse_threshold(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- 3) Função: registra violação (chamável pelas edge functions via service_role)
CREATE OR REPLACE FUNCTION public.record_mcp_access_violation(
  _user_id UUID,
  _reason TEXT,
  _source TEXT,
  _operation TEXT DEFAULT NULL,
  _target_key_id UUID DEFAULT NULL,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _request_id TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.mcp_access_violations (
    user_id, reason, source, operation, target_key_id,
    ip_address, user_agent, request_id, details
  ) VALUES (
    _user_id, _reason, _source, _operation, _target_key_id,
    _ip, _user_agent, _request_id, COALESCE(_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  PERFORM public.check_mcp_abuse_threshold(_user_id, _ip);

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Nunca derruba a operação chamadora
  RAISE WARNING 'record_mcp_access_violation failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.record_mcp_access_violation(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_mcp_access_violation(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB) TO service_role, authenticated;

-- 4) Trigger de fallback em mcp_api_keys: se uma operação chegar à tabela
--    sem service_role (caso anômalo), registra violação. (RLS já bloqueia,
--    mas mantemos um BEFORE trigger para capturar se RLS for desabilitado ou
--    para escritas via roles inesperados.)
CREATE OR REPLACE FUNCTION public.guard_mcp_api_keys_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := current_setting('role', true);
  v_actor UUID := auth.uid();
BEGIN
  -- Se for service_role (edge functions), permite normalmente
  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Caso contrário, registra violação e bloqueia
  PERFORM public.record_mcp_access_violation(
    v_actor,
    'unauthorized_direct_write',
    'db_trigger:mcp_api_keys',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    NULL,
    NULL,
    NULL,
    jsonb_build_object('current_user', current_user, 'role', v_role)
  );

  RAISE EXCEPTION 'Direct writes to mcp_api_keys are not allowed';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mcp_api_keys ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_guard_mcp_api_keys ON public.mcp_api_keys;
CREATE TRIGGER trg_guard_mcp_api_keys
  BEFORE INSERT OR UPDATE OR DELETE ON public.mcp_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.guard_mcp_api_keys_writes();