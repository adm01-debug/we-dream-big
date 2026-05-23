-- LOTE A 6/6 - step-up auth functions
CREATE OR REPLACE FUNCTION public.start_step_up_challenge(_action text, _target_ref text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  INSERT INTO public.step_up_challenges (user_id,action,target_ref) VALUES (auth.uid(),_action,_target_ref) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.start_step_up_challenge(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_step_up_challenge(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_step_up_password(_challenge_id uuid, _password_attempt text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.step_up_challenges SET password_verified=true
  WHERE id=_challenge_id AND user_id=auth.uid() AND consumed=false AND expires_at > now();
  RETURN FOUND;
END; $$;
REVOKE EXECUTE ON FUNCTION public.verify_step_up_password(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_step_up_password(uuid,text) TO authenticated;
