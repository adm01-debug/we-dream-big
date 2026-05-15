
ALTER TABLE public.external_connections
  ADD COLUMN IF NOT EXISTS last_latency_ms integer,
  ADD COLUMN IF NOT EXISTS env_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_connections_envkey_type
  ON public.external_connections (env_key, type)
  WHERE env_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_connections_type
  ON public.external_connections (type);
