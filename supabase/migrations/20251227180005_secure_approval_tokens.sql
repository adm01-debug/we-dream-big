-- Migration: Tokens de Aprovação Seguros
-- Data: 2025-12-27
-- Segurança: crypto.randomBytes(32) + 48h TTL + rate limit

-- 1. Adicionar campos de segurança
ALTER TABLE quote_approval_tokens
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

-- 2. Reduzir TTL de 7 dias para 48h (atualizar default)
ALTER TABLE quote_approval_tokens 
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '48 hours');

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_approval_tokens_quote ON quote_approval_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_expires ON quote_approval_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_used ON quote_approval_tokens(is_used);

-- 4. Função para invalidar token após uso
CREATE OR REPLACE FUNCTION invalidate_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_used = TRUE;
  NEW.used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para invalidar automaticamente
ALTER TABLE quote_approval_tokens ADD COLUMN IF NOT EXISTS approved TIMESTAMPTZ;

DROP TRIGGER IF EXISTS trigger_invalidate_token ON quote_approval_tokens;
-- Could not auto-detect table for DROP TRIGGER IF EXISTS trigger_invalidate_token
CREATE TRIGGER trigger_invalidate_token
  BEFORE UPDATE OF approved ON quote_approval_tokens
  FOR EACH ROW
  WHEN (NEW.approved IS NOT NULL AND OLD.approved IS NULL)
  EXECUTE FUNCTION invalidate_approval_token();

-- 6. Comentários
COMMENT ON COLUMN quote_approval_tokens.ip_address IS 'IP do aprovador para auditoria';
COMMENT ON COLUMN quote_approval_tokens.user_agent IS 'User-Agent do navegador para auditoria';
COMMENT ON COLUMN quote_approval_tokens.attempts IS 'Número de tentativas de acesso';
COMMENT ON COLUMN quote_approval_tokens.is_used IS 'Token já foi utilizado (uso único)';
