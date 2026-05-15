-- =====================================================
-- ANTI-SCRAPING INFRASTRUCTURE
-- =====================================================

-- 1. Rate limiting table (per IP/identifier + endpoint window)
CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,           -- IP address or user_id
  endpoint text NOT NULL,              -- function name
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON public.request_rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.request_rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until
  ON public.request_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'request_rate_limits' AND policyname = 'Admins can read rate limits') THEN
    CREATE POLICY "Admins can read rate limits"
      ON public.request_rate_limits FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'request_rate_limits' AND policyname = 'Service role can manage rate limits') THEN
    CREATE POLICY "Service role can manage rate limits"
      ON public.request_rate_limits FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Bot detection log
CREATE TABLE IF NOT EXISTS public.bot_detection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_agent text,
  endpoint text NOT NULL,
  detection_reason text NOT NULL,    -- 'ua_blacklist', 'rate_exceeded', 'no_referer', 'suspicious_pattern'
  request_count integer DEFAULT 1,
  blocked boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_log_ip ON public.bot_detection_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_log_created ON public.bot_detection_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_log_blocked ON public.bot_detection_log(blocked) WHERE blocked = true;

ALTER TABLE public.bot_detection_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_detection_log' AND policyname = 'Admins can read bot log') THEN
    CREATE POLICY "Admins can read bot log"
      ON public.bot_detection_log FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_detection_log' AND policyname = 'Service role can insert bot log') THEN
    CREATE POLICY "Service role can insert bot log"
      ON public.bot_detection_log FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Atomic rate limit check function (returns allowed + remaining)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _endpoint text,
  _max_requests integer DEFAULT 60,
  _window_seconds integer DEFAULT 60,
  _block_duration_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _now timestamptz := now();
  _window_start timestamptz := _now - make_interval(secs => _window_seconds);
BEGIN
  -- Atomic upsert with row lock
  INSERT INTO public.request_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (_identifier, _endpoint, 1, _now)
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET 
    request_count = CASE 
      WHEN request_rate_limits.window_start < _window_start THEN 1
      ELSE request_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN request_rate_limits.window_start < _window_start THEN _now
      ELSE request_rate_limits.window_start
    END,
    blocked_until = CASE
      WHEN request_rate_limits.blocked_until IS NOT NULL AND request_rate_limits.blocked_until > _now 
        THEN request_rate_limits.blocked_until
      WHEN request_rate_limits.window_start >= _window_start AND request_rate_limits.request_count + 1 > _max_requests
        THEN _now + make_interval(secs => _block_duration_seconds)
      ELSE NULL
    END,
    updated_at = _now
  RETURNING * INTO _row;

  -- Currently blocked?
  IF _row.blocked_until IS NOT NULL AND _row.blocked_until > _now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', _row.blocked_until,
      'retry_after_seconds', EXTRACT(EPOCH FROM (_row.blocked_until - _now))::integer
    );
  END IF;

  -- Exceeded limit in current window?
  IF _row.request_count > _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_exceeded',
      'count', _row.request_count,
      'limit', _max_requests,
      'retry_after_seconds', _block_duration_seconds
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', _row.request_count,
    'limit', _max_requests,
    'remaining', GREATEST(_max_requests - _row.request_count, 0)
  );
END;
$$;

-- 4. Cleanup function (call via cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.request_rate_limits
  WHERE updated_at < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  DELETE FROM public.bot_detection_log
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;