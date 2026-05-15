-- Fix orders FK to SET NULL on quote delete
ALTER TABLE public.orders
  DROP CONSTRAINT orders_quote_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;