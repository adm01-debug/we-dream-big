ALTER TABLE public.query_telemetry
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_hit boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_query_telemetry_cache_hit_created
  ON public.query_telemetry (cache_hit, created_at DESC)
  WHERE cache_hit = true;

CREATE INDEX IF NOT EXISTS idx_query_telemetry_retry_count_created
  ON public.query_telemetry (retry_count, created_at DESC)
  WHERE retry_count > 0;