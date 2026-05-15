ALTER TABLE public.external_connections
  ADD COLUMN IF NOT EXISTS auto_test_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_external_connections_auto_test_enabled
  ON public.external_connections (auto_test_enabled)
  WHERE auto_test_enabled = true;