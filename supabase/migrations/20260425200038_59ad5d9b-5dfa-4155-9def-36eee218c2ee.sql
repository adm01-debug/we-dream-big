-- Extend admin_audit_log with richer per-call metadata
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS request_id      text,
  ADD COLUMN IF NOT EXISTS started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at     timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms     integer,
  ADD COLUMN IF NOT EXISTS status          text,
  ADD COLUMN IF NOT EXISTS payload_summary jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source          text;

-- Helpful lookup indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_request_id
  ON public.admin_audit_log (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_status
  ON public.admin_audit_log (status, created_at DESC)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_source
  ON public.admin_audit_log (source, created_at DESC)
  WHERE source IS NOT NULL;

COMMENT ON COLUMN public.admin_audit_log.request_id      IS 'Per-call correlation ID (UUID) shared across logs/edge function chain';
COMMENT ON COLUMN public.admin_audit_log.started_at      IS 'Edge function / handler start timestamp (UTC)';
COMMENT ON COLUMN public.admin_audit_log.finished_at     IS 'Edge function / handler end timestamp (UTC)';
COMMENT ON COLUMN public.admin_audit_log.duration_ms     IS 'Total handler duration in milliseconds';
COMMENT ON COLUMN public.admin_audit_log.status          IS 'success | error | denied | partial';
COMMENT ON COLUMN public.admin_audit_log.payload_summary IS 'Structured, redacted summary of inbound payload (no secrets, no full tokens)';
COMMENT ON COLUMN public.admin_audit_log.source          IS 'Originating edge function / module name (e.g. mcp-keys-issue, mcp-server)';