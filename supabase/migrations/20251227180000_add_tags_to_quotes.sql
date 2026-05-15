-- Migration: Adicionar campo tags em quotes
-- Data: 2025-12-27
-- Descrição: Campo JSONB para armazenar array de tags

-- 1. Adicionar coluna tags (array de strings em formato JSONB)
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- 2. Criar índice GIN para busca eficiente em tags
CREATE INDEX IF NOT EXISTS idx_quotes_tags ON quotes USING GIN (tags);

-- 3. Adicionar comentário
COMMENT ON COLUMN quotes.tags IS 'Tags/etiquetas para categorização de orçamentos (array JSON de strings)';

-- 4. Exemplo de uso:
-- UPDATE quotes SET tags = '["urgente", "vip", "evento"]'::jsonb WHERE id = '...';

-- 5. Query de exemplo para buscar por tag:
-- SELECT * FROM quotes WHERE tags @> '["urgente"]'::jsonb;

