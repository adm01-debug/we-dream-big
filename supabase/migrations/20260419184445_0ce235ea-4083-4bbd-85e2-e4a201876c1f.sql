-- 1. Tabela de log de rotação de secrets
CREATE TABLE IF NOT EXISTS public.secret_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name TEXT NOT NULL,
  rotated_by UUID NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_suffix TEXT,
  new_suffix TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_secret_rotation_log_name_time
  ON public.secret_rotation_log (secret_name, rotated_at DESC);

ALTER TABLE public.secret_rotation_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'secret_rotation_log' AND policyname = 'Admins read secret_rotation_log') THEN
    CREATE POLICY "Admins read secret_rotation_log"
      ON public.secret_rotation_log FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'secret_rotation_log' AND policyname = 'Admins insert secret_rotation_log') THEN
    CREATE POLICY "Admins insert secret_rotation_log"
      ON public.secret_rotation_log FOR INSERT
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND rotated_by = auth.uid());
  END IF;
END $$;

-- 2. Circuit breaker em outbound_webhooks
ALTER TABLE public.outbound_webhooks
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_disabled_reason TEXT;
