
ALTER TABLE public.quote_approval_tokens
  ADD COLUMN IF NOT EXISTS signer_name TEXT,
  ADD COLUMN IF NOT EXISTS signer_document TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip TEXT,
  ADD COLUMN IF NOT EXISTS signer_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS signature_hash TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quote_approval_tokens.signer_name IS 'Nome completo do cliente que assinou eletronicamente';
COMMENT ON COLUMN public.quote_approval_tokens.signer_document IS 'CPF ou CNPJ do signatário (somente dígitos)';
COMMENT ON COLUMN public.quote_approval_tokens.signature_hash IS 'SHA-256 hex de token+nome+documento+timestamp+IP — prova de integridade';
