
CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _monthly_limit integer;
  _is_unlimited boolean;
  _used integer;
BEGIN
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF _role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'remaining', 0, 'reason', 'no_role');
  END IF;

  SELECT monthly_limit, is_unlimited INTO _monthly_limit, _is_unlimited
  FROM public.ai_usage_quotas WHERE role = _role;

  IF _is_unlimited THEN
    SELECT count(*) INTO _used FROM public.ai_usage_logs
    WHERE user_id = _user_id AND created_at >= date_trunc('month', now()) AND status IN ('success', 'pending');
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', -1, 'remaining', -1, 'unlimited', true);
  END IF;

  SELECT count(*) INTO _used FROM public.ai_usage_logs
  WHERE user_id = _user_id AND created_at >= date_trunc('month', now()) AND status IN ('success', 'pending');

  RETURN jsonb_build_object(
    'allowed', _used < _monthly_limit,
    'used', _used,
    'limit', _monthly_limit,
    'remaining', GREATEST(_monthly_limit - _used, 0),
    'unlimited', false
  );
END;
$$;
