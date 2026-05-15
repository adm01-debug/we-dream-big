
-- =========================================================
-- STEP-UP AUTH: Dupla verificação para ações sensíveis
-- =========================================================

-- Enum de ações que exigem step-up
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'step_up_action' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.step_up_action AS ENUM (
  'promote_dev',
  'demote_dev',
  'mcp_full_issue',
  'mcp_full_escalate',
  'secret_rotation',
  'secret_revoke'
);
  END IF;
END $$;

-- Tabela de challenges (OTP enviado por e-mail)
CREATE TABLE IF NOT EXISTS public.step_up_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action public.step_up_action NOT NULL,
  target_ref TEXT,
  otp_hash TEXT NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  password_verified BOOLEAN NOT NULL DEFAULT false,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_step_up_challenges_user ON public.step_up_challenges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_up_challenges_expires ON public.step_up_challenges(expires_at) WHERE consumed = false;

ALTER TABLE public.step_up_challenges ENABLE ROW LEVEL SECURITY;

-- Apenas o dono vê seus challenges; ninguém faz INSERT/UPDATE direto (apenas via RPC SECURITY DEFINER)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'step_up_challenges' AND policyname = 'Users can view own challenges') THEN
    CREATE POLICY "Users can view own challenges"
      ON public.step_up_challenges FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Tokens de uso único emitidos após verificação completa
CREATE TABLE IF NOT EXISTS public.step_up_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action public.step_up_action NOT NULL,
  target_ref TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  challenge_id UUID NOT NULL REFERENCES public.step_up_challenges(id) ON DELETE CASCADE,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_step_up_tokens_hash ON public.step_up_tokens(token_hash) WHERE consumed = false;
CREATE INDEX IF NOT EXISTS idx_step_up_tokens_user ON public.step_up_tokens(user_id, created_at DESC);

ALTER TABLE public.step_up_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'step_up_tokens' AND policyname = 'Users can view own tokens') THEN
    CREATE POLICY "Users can view own tokens"
      ON public.step_up_tokens FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auditoria
CREATE TABLE IF NOT EXISTS public.step_up_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action public.step_up_action,
  target_ref TEXT,
  event_type TEXT NOT NULL, -- 'challenge_requested' | 'password_verified' | 'otp_verified' | 'token_issued' | 'token_consumed' | 'failed' | 'rate_limited' | 'unauthorized'
  challenge_id UUID,
  token_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_step_up_audit_user ON public.step_up_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_up_audit_action ON public.step_up_audit_log(action, created_at DESC);

ALTER TABLE public.step_up_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'step_up_audit_log' AND policyname = 'Devs can view all audit logs') THEN
    CREATE POLICY "Devs can view all audit logs"
      ON public.step_up_audit_log FOR SELECT
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'step_up_audit_log' AND policyname = 'Users can view own audit logs') THEN
    CREATE POLICY "Users can view own audit logs"
      ON public.step_up_audit_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================================================
-- RPC: solicitar challenge (gera OTP, retorna challenge_id e otp_plain p/ envio por e-mail via edge function)
-- =========================================================
CREATE OR REPLACE FUNCTION public.request_step_up_challenge(
  _action public.step_up_action,
  _target_ref TEXT DEFAULT NULL,
  _ip INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(challenge_id UUID, otp_plain TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _otp TEXT;
  _otp_h TEXT;
  _cid UUID;
  _exp TIMESTAMPTZ;
  _recent_count INT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no session';
  END IF;

  -- Apenas dev pode solicitar step-up para essas ações
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'unauthorized', _ip, _user_agent);
    RAISE EXCEPTION 'forbidden: dev role required';
  END IF;

  -- Rate limit: máx 5 challenges por usuário por hora
  SELECT count(*) INTO _recent_count
  FROM public.step_up_challenges
  WHERE user_id = _uid AND created_at > (now() - interval '1 hour');

  IF _recent_count >= 5 THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'rate_limited', _ip, _user_agent);
    RAISE EXCEPTION 'rate_limited: too many step-up requests';
  END IF;

  -- Gera OTP de 6 dígitos
  _otp := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _otp_h := encode(digest(_otp || _uid::text, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_challenges(user_id, action, target_ref, otp_hash, expires_at, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, _otp_h, _exp, _ip, _user_agent)
  RETURNING id INTO _cid;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, 'challenge_requested', _cid, _ip, _user_agent);

  RETURN QUERY SELECT _cid, _otp, _exp;
END;
$$;

-- =========================================================
-- RPC: marcar senha como verificada (chamada pela edge function após signInWithPassword)
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_step_up_password_verified(_challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
BEGIN
  SELECT * INTO _row FROM public.step_up_challenges
  WHERE id = _challenge_id AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.step_up_challenges SET password_verified = true WHERE id = _challenge_id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id)
  VALUES (_uid, _row.action, _row.target_ref, 'password_verified', _challenge_id);

  RETURN true;
END;
$$;

-- =========================================================
-- RPC: verificar OTP e emitir token de uso único (após senha já validada)
-- =========================================================
CREATE OR REPLACE FUNCTION public.verify_step_up_otp(_challenge_id UUID, _otp TEXT)
RETURNS TABLE(token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
  _otp_h TEXT;
  _token TEXT;
  _token_h TEXT;
  _tid UUID;
  _exp TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO _row FROM public.step_up_challenges
  WHERE id = _challenge_id AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, event_type, challenge_id, metadata)
    VALUES (_uid, 'failed', _challenge_id, '{"reason":"challenge_not_found_or_expired"}'::jsonb);
    RAISE EXCEPTION 'invalid_or_expired_challenge';
  END IF;

  IF NOT _row.password_verified THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"password_not_verified"}'::jsonb);
    RAISE EXCEPTION 'password_not_verified_first';
  END IF;

  IF _row.attempts >= _row.max_attempts THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"max_attempts"}'::jsonb);
    RAISE EXCEPTION 'max_attempts_exceeded';
  END IF;

  _otp_h := encode(digest(_otp || _uid::text, 'sha256'), 'hex');

  IF _otp_h <> _row.otp_hash THEN
    UPDATE public.step_up_challenges SET attempts = attempts + 1 WHERE id = _challenge_id;
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, jsonb_build_object('reason','wrong_otp','attempt', _row.attempts + 1));
    RAISE EXCEPTION 'invalid_otp';
  END IF;

  -- OK: gera token de uso único
  _token := encode(gen_random_bytes(32), 'hex');
  _token_h := encode(digest(_token, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_tokens(user_id, action, target_ref, token_hash, challenge_id, expires_at)
  VALUES (_uid, _row.action, _row.target_ref, _token_h, _challenge_id, _exp)
  RETURNING id INTO _tid;

  UPDATE public.step_up_challenges
    SET otp_verified = true, consumed = true
    WHERE id = _challenge_id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'otp_verified', _challenge_id, _tid);
  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'token_issued', _challenge_id, _tid);

  RETURN QUERY SELECT _token, _exp;
END;
$$;

-- =========================================================
-- RPC: consumir token (uso único) — usada pelas edge functions de ação sensível
-- =========================================================
CREATE OR REPLACE FUNCTION public.consume_step_up_token(
  _token TEXT,
  _expected_action public.step_up_action,
  _expected_target TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _token_h TEXT;
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF _token IS NULL OR length(_token) < 32 THEN RETURN false; END IF;

  -- Re-checagem crítica: usuário ainda precisa ser dev no momento do consumo
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'unauthorized', '{"reason":"role_lost_at_consume"}'::jsonb);
    RETURN false;
  END IF;

  _token_h := encode(digest(_token, 'sha256'), 'hex');

  SELECT * INTO _row FROM public.step_up_tokens
  WHERE token_hash = _token_h AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', '{"reason":"token_invalid_or_expired"}'::jsonb);
    RETURN false;
  END IF;

  IF _row.action <> _expected_action THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, jsonb_build_object('reason','action_mismatch','expected',_expected_action,'got',_row.action));
    RETURN false;
  END IF;

  IF _expected_target IS NOT NULL AND _row.target_ref IS DISTINCT FROM _expected_target THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, '{"reason":"target_mismatch"}'::jsonb);
    RETURN false;
  END IF;

  UPDATE public.step_up_tokens SET consumed = true, consumed_at = now() WHERE id = _row.id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id)
  VALUES (_uid, _expected_action, _expected_target, 'token_consumed', _row.id);

  RETURN true;
END;
$$;

-- Limpeza periódica
CREATE OR REPLACE FUNCTION public.cleanup_expired_step_up()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');
  DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');
$$;

-- Garante que pgcrypto está disponível (digest, gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
