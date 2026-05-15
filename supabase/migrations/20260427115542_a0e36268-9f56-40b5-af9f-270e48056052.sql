
-- Hardening: índices em FKs sem cobertura, evitando seq scans em joins/cascade.
-- Identificados via audit pg_constraint × pg_index em 2026-04-27.
CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_campaign_id
  ON public.magic_up_public_shares (campaign_id);

CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_generation_id
  ON public.magic_up_public_shares (generation_id);

CREATE INDEX IF NOT EXISTS idx_product_price_freshness_overrides_updated_by
  ON public.product_price_freshness_overrides (updated_by);

CREATE INDEX IF NOT EXISTS idx_step_up_tokens_challenge_id
  ON public.step_up_tokens (challenge_id);
