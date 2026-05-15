
-- Default 30-day expiration for new tokens
ALTER TABLE public.quote_approval_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

ALTER TABLE public.kit_share_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- Backfill existing rows missing expires_at (active ones only)
UPDATE public.quote_approval_tokens
SET expires_at = now() + interval '30 days'
WHERE expires_at IS NULL AND status = 'active';

UPDATE public.kit_share_tokens
SET expires_at = now() + interval '30 days'
WHERE expires_at IS NULL AND status = 'active';

-- Failure log table
CREATE TABLE IF NOT EXISTS public.public_token_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('quote','kit')),
  resource_id text,
  attempted_token text,
  ip_address text,
  user_agent text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_token_failures_resource
  ON public.public_token_failures (resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_token_failures_ip
  ON public.public_token_failures (ip_address, created_at DESC);

ALTER TABLE public.public_token_failures ENABLE ROW LEVEL SECURITY;

-- Only admins can read failures (sellers see anomalies via SecurityCenter)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'public_token_failures' AND policyname = 'Admins read token failures') THEN
    CREATE POLICY "Admins read token failures"
    ON public.public_token_failures FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Service role / edge functions write failures (no insert from authenticated/anon)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'public_token_failures' AND policyname = 'Service role inserts token failures') THEN
    CREATE POLICY "Service role inserts token failures"
    ON public.public_token_failures FOR INSERT TO service_role
    WITH CHECK (true);
  END IF;
END $$;

-- Helper function: log a failure and auto-expire all active tokens for a resource
-- after 5 failures within the last hour.
CREATE OR REPLACE FUNCTION public.record_public_token_failure(
  _resource_type text,
  _resource_id text,
  _attempted_token text,
  _ip text,
  _ua text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.record_public_token_failure(text, text, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_token_failure(text, text, text, text, text, text) TO service_role;
