
CREATE OR REPLACE FUNCTION public.acquire_ai_quota(
  _user_id uuid,
  _function_name text,
  _model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _monthly_limit integer;
  _is_unlimited boolean;
  _used integer;
  _log_id uuid;
BEGIN
  -- Get user role
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF _role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'log_id', null, 'reason', 'no_role');
  END IF;

  -- Get quota for role (with row lock to prevent concurrent reads)
  SELECT monthly_limit, is_unlimited INTO _monthly_limit, _is_unlimited
  FROM public.ai_usage_quotas WHERE role = _role
  FOR UPDATE;

  -- Count usage this month (locking rows to prevent race)
  SELECT count(*) INTO _used FROM public.ai_usage_logs
  WHERE user_id = _user_id 
    AND created_at >= date_trunc('month', now()) 
    AND status = 'success';

  -- Check if unlimited
  IF _is_unlimited THEN
    INSERT INTO public.ai_usage_logs (user_id, function_name, model, status)
    VALUES (_user_id, _function_name, _model, 'pending')
    RETURNING id INTO _log_id;
    
    RETURN jsonb_build_object('allowed', true, 'log_id', _log_id, 'used', _used, 'unlimited', true);
  END IF;

  -- Check quota
  IF _used >= _monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'log_id', null, 'used', _used, 'limit', _monthly_limit, 'remaining', 0);
  END IF;

  -- Reserve slot by inserting a pending log
  INSERT INTO public.ai_usage_logs (user_id, function_name, model, status)
  VALUES (_user_id, _function_name, _model, 'pending')
  RETURNING id INTO _log_id;

  RETURN jsonb_build_object(
    'allowed', true, 
    'log_id', _log_id, 
    'used', _used + 1, 
    'limit', _monthly_limit, 
    'remaining', GREATEST(_monthly_limit - _used - 1, 0)
  );
END;
$$;
