ALTER TABLE public.custom_kits
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_custom_kits_user_pinned
  ON public.custom_kits(user_id, is_pinned DESC, last_used_at DESC NULLS LAST);