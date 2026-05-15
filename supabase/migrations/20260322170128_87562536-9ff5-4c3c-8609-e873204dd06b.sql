ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS kit_group_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kit_name text DEFAULT NULL;