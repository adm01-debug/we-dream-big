-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.1_step_up_mfa - RPCs follow-up post merge
-- 8 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: cleanup_expired_step_up(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_step_up() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DELETE FROM public.step_up_challenges WHERE expires_at < (now() - interval '1 day');
  DELETE FROM public.step_up_tokens WHERE expires_at < (now() - interval '1 day');
$$;


--

--

--

-- Name: consume_step_up_token(text, public.step_up_action, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_step_up_token(_token text, _expected_action public.step_up_action, _expected_target text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

--

-- Name: mark_step_up_password_verified(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_step_up_password_verified(_challenge_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

--

-- Name: request_step_up_challenge(public.step_up_action, text, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_step_up_challenge(_action public.step_up_action, _target_ref text DEFAULT NULL::text, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text) RETURNS TABLE(challenge_id uuid, otp_plain text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

--

-- Name: verify_step_up_otp(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_step_up_otp(_challenge_id uuid, _otp text) RETURNS TABLE(token text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

-- Name: revoke_all_user_tokens(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_all_user_tokens(_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_token_revocations (user_id, revoked_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = now();
END;
$$;


--

--

--

-- Name: record_public_token_failure(text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_public_token_failure(_resource_type text, _resource_id text, _attempted_token text, _ip text, _ua text, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _recent_failures int;
BEGIN
  INSERT INTO public.public_token_failures (
    resource_type, resource_id, attempted_token, ip_address, user_agent, reason
  ) VALUES (
    _resource_type, _resource_id, _attempted_token, _ip, _ua, _reason
  );

  IF _resource_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO _recent_failures
  FROM public.public_token_failures
  WHERE resource_type = _resource_type
    AND resource_id = _resource_id
    AND created_at > now() - interval '1 hour';

  IF _recent_failures >= 5 THEN
    IF _resource_type = 'quote' THEN
      UPDATE public.quote_approval_tokens
      SET status = 'expired', updated_at = now()
      WHERE quote_id = _resource_id AND status = 'active';
    ELSIF _resource_type = 'kit' THEN
      UPDATE public.kit_share_tokens
      SET status = 'expired', updated_at = now()
      WHERE kit_id::text = _resource_id AND status = 'active';
    END IF;
  END IF;
END;
$$;


--

--

--

-- Name: generate_secure_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_secure_token() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Generate a cryptographically secure 32-byte hex token
  NEW.token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$;


--

--

COMMIT;
