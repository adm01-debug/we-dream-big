-- Wave 3.3.C.1 - quote_templates unificado
ALTER TABLE public.quote_templates RENAME COLUMN default_payment_terms TO payment_terms;
ALTER TABLE public.quote_templates RENAME COLUMN default_delivery_terms TO delivery_time;
ALTER TABLE public.quote_templates RENAME COLUMN default_notes TO notes;
ALTER TABLE public.quote_templates
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT 30;
