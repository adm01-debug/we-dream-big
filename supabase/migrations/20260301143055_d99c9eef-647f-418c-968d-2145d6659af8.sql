-- Remove FK constraint on client_id since clients come from external CRM (not bitrix_clients)
ALTER TABLE public.generated_mockups DROP CONSTRAINT IF EXISTS generated_mockups_client_id_fkey;