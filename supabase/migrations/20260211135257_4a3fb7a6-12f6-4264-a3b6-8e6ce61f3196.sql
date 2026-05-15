-- Remove FK constraint que impede salvar area_id do BD externo como technique_id
ALTER TABLE public.quote_item_personalizations
  DROP CONSTRAINT quote_item_personalizations_technique_id_fkey;

-- Adicionar coluna para nome da técnica (já existia no código mas não no BD)
ALTER TABLE public.quote_item_personalizations
  ADD COLUMN IF NOT EXISTS technique_name TEXT;

-- Permitir technique_id nulo (para compatibilidade)
ALTER TABLE public.quote_item_personalizations
  ALTER COLUMN technique_id DROP NOT NULL;