-- Fix quotes.client_id FK to reference companies instead of bitrix_clients
ALTER TABLE public.quotes
  DROP CONSTRAINT quotes_client_id_fkey;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.companies(id) ON DELETE SET NULL;