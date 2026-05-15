ALTER TABLE public.quote_items
ADD COLUMN IF NOT EXISTS price_confirmed_at timestamptz NULL;

COMMENT ON COLUMN public.quote_items.price_confirmed_at IS 'Timestamp em que o vendedor confirmou o preço com o fornecedor durante a montagem do orçamento. Quando preenchido, suprime o badge de preço defasado para este item.';