-- RPC para registrar tentativas de acesso negado em admin_audit_log (server-side)
-- Security definer para escrever na tabela mesmo com RLS restritiva.
-- Limita: o caller só pode registrar uma tentativa em nome de SI MESMO.

CREATE OR REPLACE FUNCTION public.log_access_denied(
  _blocked_path text,
  _required_role text,
  _user_role text DEFAULT NULL,
  _reason text DEFAULT 'route_blocked'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    -- Não autenticado: ignora silenciosamente (não polui o log)
    RETURN;
  END IF;

  IF _required_role NOT IN ('dev','admin','supervisor') THEN
    RAISE EXCEPTION 'invalid required_role: %', _required_role;
  END IF;

  INSERT INTO public.admin_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    status,
    source,
    started_at,
    finished_at,
    duration_ms,
    request_id,
    payload_summary,
    details
  ) VALUES (
    _uid,
    'route.access_denied',
    'route',
    _blocked_path,
    'denied',
    'frontend-guard',
    now(),
    now(),
    0,
    gen_random_uuid()::text,
    jsonb_build_object('blocked_path', _blocked_path),
    jsonb_build_object(
      'reason', _reason,
      'blocked_path', _blocked_path,
      'required_role', _required_role,
      'user_role', _user_role
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_access_denied(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_access_denied(text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.log_access_denied IS
'Registra tentativa de acesso negado a rota técnica em admin_audit_log. Chamado pelo frontend quando guardas (DevRoute/AdminRoute) bloqueiam navegação. O caller só registra em nome do próprio auth.uid().';
