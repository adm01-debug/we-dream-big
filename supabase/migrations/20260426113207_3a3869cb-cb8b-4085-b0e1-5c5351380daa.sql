-- =========================================================================
-- record_dev_route_telemetry: telemetria de UX para tela de bloqueio /dev
-- =========================================================================
-- Estratégia:
--  - Reusa admin_audit_log (não cria tabela nova) com action='route.ux_event',
--    source='dev-route-ui', resource_type='route', resource_id=<path>.
--  - Whitelist de event_type: previne logs arbitrários do cliente.
--  - Sanitização: clamp em duration_ms (0..3600000), limita tamanho de path
--    e role, ignora qualquer payload do cliente além do que a função monta.
--  - Rate limit: máx 30 eventos/minuto/usuário (defesa contra spam).
--  - SECURITY DEFINER + RLS de SELECT já restringe leitura a is_dev().

CREATE OR REPLACE FUNCTION public.record_dev_route_telemetry(
  _event_type    text,
  _blocked_path  text,
  _user_role     text DEFAULT NULL,
  _duration_ms   integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe_path text;
  _safe_role text;
  _safe_duration integer;
  _recent_count integer;
  _allowed_events constant text[] := ARRAY[
    'view',           -- usuário viu a tela 403
    'back',           -- clicou em "Voltar" (history -1)
    'retry',          -- clicou em "Tentar novamente" (mesmo path)
    'fallback',       -- foi para área segura (Início/Usuários/Catálogo)
    'request_access', -- clicou em "Solicitar acesso a Dev"
    'copy_link',      -- copiou o link da rota bloqueada
    'mail',           -- abriu cliente de e-mail
    'abandon'         -- saiu/fechou a aba (best-effort beacon)
  ];
BEGIN
  -- 1) Anônimo: ignora silenciosamente (não polui audit log).
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  -- 2) Whitelist de event_type (defense-in-depth).
  IF NOT (_event_type = ANY (_allowed_events)) THEN
    RAISE EXCEPTION 'invalid event_type: %', _event_type
      USING ERRCODE = '22023';
  END IF;

  -- 3) Sanitização (sem PII):
  --    - path: trim + corta em 200 chars (rotas internas são curtas).
  --    - role: corta em 32 chars; só aceita papéis conhecidos.
  --    - duration_ms: clamp em [0, 3_600_000] (1h).
  _safe_path := substring(coalesce(_blocked_path, '') from 1 for 200);
  IF length(_safe_path) = 0 THEN
    RAISE EXCEPTION 'blocked_path required' USING ERRCODE = '22023';
  END IF;

  _safe_role := substring(coalesce(_user_role, '') from 1 for 32);
  IF _safe_role NOT IN ('dev','admin','supervisor','agente','agent','vendedor','') THEN
    _safe_role := 'unknown';
  END IF;
  IF length(_safe_role) = 0 THEN
    _safe_role := NULL;
  END IF;

  IF _duration_ms IS NULL THEN
    _safe_duration := NULL;
  ELSIF _duration_ms < 0 THEN
    _safe_duration := 0;
  ELSIF _duration_ms > 3600000 THEN
    _safe_duration := 3600000;
  ELSE
    _safe_duration := _duration_ms;
  END IF;

  -- 4) Rate limit por usuário: 30 eventos/min.
  --    Usa o mesmo log para evitar tabela auxiliar.
  SELECT count(*) INTO _recent_count
  FROM public.admin_audit_log
  WHERE user_id = _uid
    AND action  = 'route.ux_event'
    AND source  = 'dev-route-ui'
    AND created_at > now() - interval '1 minute';

  IF _recent_count >= 30 THEN
    -- Excede orçamento: descarta silenciosamente para não amplificar abuso.
    RETURN;
  END IF;

  -- 5) Insere o evento. payload_summary intencionalmente mínimo (sem
  --    user_agent/IP/email — esses campos só são preenchidos por edge
  --    functions com service role e contexto de request).
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
    'route.ux_event',
    'route',
    _safe_path,
    CASE WHEN _event_type IN ('view','abandon','copy_link','mail') THEN 'denied'
         WHEN _event_type IN ('back','retry','fallback')           THEN 'partial'
         WHEN _event_type = 'request_access'                       THEN 'success'
         ELSE 'denied' END,
    'dev-route-ui',
    now(),
    now(),
    _safe_duration,
    gen_random_uuid()::text,
    jsonb_build_object(
      'event_type',   _event_type,
      'blocked_path', _safe_path
    ),
    jsonb_build_object(
      'event_type',   _event_type,
      'blocked_path', _safe_path,
      'user_role',    _safe_role,
      'duration_ms',  _safe_duration
    )
  );
END;
$$;

-- Apenas usuários autenticados podem invocar (anônimos são ignorados de qualquer forma).
REVOKE ALL ON FUNCTION public.record_dev_route_telemetry(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_dev_route_telemetry(text, text, text, integer)
  TO authenticated;

COMMENT ON FUNCTION public.record_dev_route_telemetry(text, text, text, integer) IS
  'Telemetria de UX da tela DevRoute (403). Whitelist de event_type, sem PII, rate-limited (30/min/user).';