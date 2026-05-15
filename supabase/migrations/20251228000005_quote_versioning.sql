-- Migration: Quote Versioning System
-- Permite criar múltiplas versões de um orçamento

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes(id);

CREATE INDEX IF NOT EXISTS idx_quotes_parent ON quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_version ON quotes(version);

-- Função para criar nova versão
CREATE OR REPLACE FUNCTION create_quote_version(p_quote_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_old_version INTEGER;
BEGIN
  SELECT version INTO v_old_version FROM quotes WHERE id = p_quote_id;
  
  INSERT INTO quotes (
    parent_quote_id, version, client_id, sales_rep_id,
    status, total_amount, valid_until, notes
  )
  SELECT
    p_quote_id, v_old_version + 1, client_id, sales_rep_id,
    'draft', total_amount, valid_until, notes
  FROM quotes WHERE id = p_quote_id
  RETURNING id INTO v_new_id;
  
  -- Copiar itens
  INSERT INTO quote_items (quote_id, product_id, quantity, unit_price)
  SELECT v_new_id, product_id, quantity, unit_price
  FROM quote_items WHERE quote_id = p_quote_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
