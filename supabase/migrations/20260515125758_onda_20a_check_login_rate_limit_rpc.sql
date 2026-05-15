-- =====================================================================
-- Onda 20.A — B-6: Server-side login rate limit (close last blocker)
-- =====================================================================
-- Cria RPC SECURITY DEFINER que pode ser chamada por anon/authenticated
-- ANTES do signInWithPassword. Consulta tabela login_attempts (persistente),
-- não bypassa via aba anônima / sessionStorage.clear() / trocar de browser.
--
-- Política: 5 falhas consecutivas (por email OR ip) em 15 min → bloqueado
-- 5 min após a 5ª falha. Após sucesso, contador "zera" (success conta como
-- delimitador).
--
-- ORIGEM: applied directly via apply_migration in another Claude session
-- on 2026-05-15. Now committed to git for migration history parity.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _email text,
  _ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _max_failures int := 5;
  _window_minutes int := 15;
  _lockout_minutes int := 5;
  _failed_count int := 0;
  _last_failure timestamptz;
  _last_success timestamptz;
  _lockout_until timestamptz;
BEGIN
  -- Sanitiza input
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    -- Fail-CLOSED em input inválido (Onda 20)
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'invalid_email',
      'remaining_seconds', 0
    );
  END IF;

  _email := lower(trim(_email));

  -- Último sucesso por este email (delimita janela de falhas)
  SELECT max(created_at) INTO _last_success
  FROM public.login_attempts
  WHERE email = _email AND success = true;

  -- Conta falhas POR EMAIL na janela, ignorando as anteriores ao último sucesso
  SELECT count(*), max(created_at)
    INTO _failed_count, _last_failure
  FROM public.login_attempts
  WHERE email = _email
    AND success = false
    AND created_at > now() - (_window_minutes || ' minutes')::interval
    AND (_last_success IS NULL OR created_at > _last_success);

  -- Se atingiu o limite por EMAIL → lockout 5 min após última falha
  IF _failed_count >= _max_failures THEN
    _lockout_until := _last_failure + (_lockout_minutes || ' minutes')::interval;
    IF _lockout_until > now() THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'rate_limited_email',
        'failed_count', _failed_count,
        'remaining_seconds', ceil(extract(epoch FROM (_lockout_until - now())))::int,
        'lockout_until', _lockout_until
      );
    END IF;
  END IF;

  -- Adicional: se _ip fornecido, verifica também por IP (mais agressivo: 20 falhas / 15min)
  IF _ip IS NOT NULL AND length(trim(_ip)) > 0 AND _ip <> 'unknown' AND _ip <> 'client' THEN
    SELECT count(*), max(created_at)
      INTO _failed_count, _last_failure
    FROM public.login_attempts
    WHERE ip_address = _ip
      AND success = false
      AND created_at > now() - (_window_minutes || ' minutes')::interval;

    IF _failed_count >= 20 THEN
      _lockout_until := _last_failure + (_lockout_minutes || ' minutes')::interval;
      IF _lockout_until > now() THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'rate_limited_ip',
          'failed_count', _failed_count,
          'remaining_seconds', ceil(extract(epoch FROM (_lockout_until - now())))::int,
          'lockout_until', _lockout_until
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'failed_count', _failed_count,
    'remaining_seconds', 0
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail-CLOSED em erro (padrão das Ondas 6/7/B-7)
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'rate_limit_check_error',
    'error', SQLERRM,
    'remaining_seconds', 0
  );
END;
$$;

-- Permite anon (formulário de login) e authenticated chamar
REVOKE ALL ON FUNCTION public.check_login_rate_limit(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.check_login_rate_limit(text, text) IS
'B-6 close: pre-signInWithPassword rate limit check. SECURITY DEFINER + fail-closed. Consulta login_attempts (persistente, bypass-proof). Onda 20.A.';
