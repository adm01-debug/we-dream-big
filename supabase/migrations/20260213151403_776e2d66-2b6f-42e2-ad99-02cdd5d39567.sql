-- Remove FK constraint on quotes.client_id since IDs come from external CRM database
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;