CREATE OR REPLACE FUNCTION public.record_platform_failure(
  p_operation text,
  p_table text DEFAULT NULL,
  p_rpc_name text DEFAULT NULL,
  p_duration_ms integer DEFAULT 0,
  p_error_message text DEFAULT NULL,
  p_is_503 boolean DEFAULT true,
  p_is_cold_start boolean DEFAULT false,
  p_retry_count integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.query_telemetry (
    operation, table_name, rpc_name, duration_ms, record_count,
    severity, error_message, error_kind, user_id,
    retry_count, cache_hit, is_503, is_cold_start
  ) VALUES (
    COALESCE(p_operation, 'unknown'),
    p_table,
    p_rpc_name,
    GREATEST(COALESCE(p_duration_ms, 0), 0),
    NULL,
    'error',
    p_error_message,
    'network',
    auth.uid(),
    GREATEST(COALESCE(p_retry_count, 0), 0),
    false,
    COALESCE(p_is_503, true),
    COALESCE(p_is_cold_start, false)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_platform_failure(text, text, text, integer, text, boolean, boolean, integer) TO authenticated;