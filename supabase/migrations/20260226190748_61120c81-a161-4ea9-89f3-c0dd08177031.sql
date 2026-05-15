
-- Add notes and status fields to seller_carts
ALTER TABLE public.seller_carts 
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'novo';

-- Comment for clarity
COMMENT ON COLUMN public.seller_carts.notes IS 'Notas gerais do carrinho (contexto da negociação)';
COMMENT ON COLUMN public.seller_carts.status IS 'Status do carrinho: novo, em_negociacao, pronto_orcamento';
