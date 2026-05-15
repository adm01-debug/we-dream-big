ALTER TABLE public.e2e_cleanup_audit
  ADD COLUMN IF NOT EXISTS seller_scope TEXT,
  ADD COLUMN IF NOT EXISTS seller_id UUID;

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_seller_id
  ON public.e2e_cleanup_audit (seller_id, created_at DESC)
  WHERE seller_id IS NOT NULL;