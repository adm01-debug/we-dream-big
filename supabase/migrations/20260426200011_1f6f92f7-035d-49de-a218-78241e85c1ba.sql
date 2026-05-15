-- 1) Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.e2e_cleanup_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL CHECK (status IN ('ok','error','rate_limited','unauthorized','forbidden','not_found','invalid')),
  reason TEXT,
  ip TEXT,
  user_agent TEXT,
  total_deleted INT NOT NULL DEFAULT 0,
  deleted_by_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_created_at
  ON public.e2e_cleanup_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_email
  ON public.e2e_cleanup_audit (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_status
  ON public.e2e_cleanup_audit (status, created_at DESC);

ALTER TABLE public.e2e_cleanup_audit ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler (service role bypassa RLS). Ninguém pode escrever via API.
DROP POLICY IF EXISTS "admins_select_e2e_cleanup_audit" ON public.e2e_cleanup_audit;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'e2e_cleanup_audit' AND policyname = 'admins_select_e2e_cleanup_audit') THEN
    CREATE POLICY "admins_select_e2e_cleanup_audit"
      ON public.e2e_cleanup_audit
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2) Tabela de rate limit
CREATE TABLE IF NOT EXISTS public.e2e_cleanup_rate_limit (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.e2e_cleanup_rate_limit ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só via service role.

-- 3) RPC atômica de check + increment
CREATE OR REPLACE FUNCTION public.e2e_cleanup_check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
)
RETURNS TABLE (allowed BOOLEAN, current_count INT, reset_in_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO public.e2e_cleanup_rate_limit AS r (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN 1
          ELSE r.count + 1
        END,
        window_start = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN v_now
          ELSE r.window_start
        END,
        updated_at = v_now
  RETURNING r.count, r.window_start INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_max) AS allowed,
    v_count AS current_count,
    GREATEST(0, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_window_start))::INT) AS reset_in_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.e2e_cleanup_check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.e2e_cleanup_check_rate_limit(TEXT, INT, INT) FROM authenticated, anon;