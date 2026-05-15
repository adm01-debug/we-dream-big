-- IP access control table (manual allowlist/blocklist)
CREATE TABLE IF NOT EXISTS public.ip_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  list_type TEXT NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_access_control ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ip_access_control' AND policyname = 'Admins can manage ip_access_control') THEN
    CREATE POLICY "Admins can manage ip_access_control"
      ON public.ip_access_control
      FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ip_access_control' AND policyname = 'Service role full access ip_access_control') THEN
    CREATE POLICY "Service role full access ip_access_control"
      ON public.ip_access_control
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Validate list_type
CREATE OR REPLACE FUNCTION public.validate_ip_access_control()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.list_type NOT IN ('allow', 'block') THEN
    RAISE EXCEPTION 'Invalid list_type: must be allow or block';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ip_access_control ON public.ip_access_control;
CREATE TRIGGER trg_validate_ip_access_control
BEFORE INSERT OR UPDATE ON public.ip_access_control
FOR EACH ROW EXECUTE FUNCTION public.validate_ip_access_control();

DROP TRIGGER IF EXISTS trg_ip_access_control_updated_at ON public.ip_access_control;
CREATE TRIGGER trg_ip_access_control_updated_at
BEFORE UPDATE ON public.ip_access_control
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ip_access_control_ip ON public.ip_access_control(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_access_control_type_expires ON public.ip_access_control(list_type, expires_at);

-- Atomic check function used by edge functions
CREATE OR REPLACE FUNCTION public.check_ip_access(_ip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type TEXT;
BEGIN
  SELECT list_type INTO _type
  FROM public.ip_access_control
  WHERE ip_address = _ip
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  RETURN _type; -- returns 'allow', 'block', or NULL
END;
$$;