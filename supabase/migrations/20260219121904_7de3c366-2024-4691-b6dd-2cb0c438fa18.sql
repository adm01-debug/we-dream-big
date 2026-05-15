
-- Correção 1: Coluna para armazenar o ID do orçamento no Bitrix24
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS bitrix_quote_id INTEGER;

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_quotes_bitrix_quote_id ON quotes(bitrix_quote_id)
  WHERE bitrix_quote_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN quotes.bitrix_quote_id IS
  'ID do orçamento no Bitrix24. Retornado pelo webhook na resposta. Enviar como quote_id para atualizar em vez de criar novo.';
