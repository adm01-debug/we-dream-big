ALTER TABLE public.e2e_cleanup_audit
  ADD COLUMN IF NOT EXISTS name_filter_prefix text;