CREATE INDEX IF NOT EXISTS idx_quote_templates_seller_id
  ON public.quote_templates (seller_id);

CREATE INDEX IF NOT EXISTS idx_seller_discount_limits_user_id
  ON public.seller_discount_limits (user_id);

CREATE INDEX IF NOT EXISTS idx_quote_history_user_id
  ON public.quote_history (user_id);