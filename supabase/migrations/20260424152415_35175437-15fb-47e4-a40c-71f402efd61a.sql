ALTER TABLE public.query_telemetry
  ADD COLUMN IF NOT EXISTS error_kind text;

CREATE INDEX IF NOT EXISTS idx_query_telemetry_error_kind_created
  ON public.query_telemetry (error_kind, created_at DESC)
  WHERE error_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_query_telemetry_op_table_created
  ON public.query_telemetry (operation, table_name, created_at DESC);