-- =====================================================================
-- MIGRATION: fix-cadastro-produtos-fornecedores-bugs
-- DB: doufsxqlfjyuvxuezpln (Produtos / Promo Gifts)
-- Data: 2026-05-26
-- Bugs corrigidos: T-03, T-04, T-05, T-12, T-13, T-18, T-20
-- ATENÇÃO: Execute em ambiente de staging primeiro!
-- =====================================================================

-- ─────────────────────────────────────────────────
-- T-12: Consolidar colunas is_active / active
-- A coluna 'active' é redundante com 'is_active'.
-- Renomear para _deprecated_ antes de remover.
-- ─────────────────────────────────────────────────
DO $$
BEGIN
  -- Garantir que is_active está sincronizado antes de deprecar
  UPDATE products SET is_active = active WHERE is_active IS NULL AND active IS NOT NULL;

  -- Renomear para marcar como deprecated (não quebra código antigo ainda)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'active'
  ) THEN
    ALTER TABLE products RENAME COLUMN active TO _deprecated_active;
    RAISE NOTICE '[T-12] Coluna products.active renomeada para _deprecated_active';
  END IF;
END $$;

-- ─────────────────────────────────────────────────
-- T-13: Consolidar category_id / main_category_id
-- ─────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'main_category_id'
  ) THEN
    -- Preencher category_id onde ainda nulo
    UPDATE products
    SET category_id = main_category_id
    WHERE category_id IS NULL AND main_category_id IS NOT NULL;

    -- Verificar se há dados exclusivos em main_category_id antes de dropar
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE main_category_id IS NOT NULL AND category_id IS DISTINCT FROM main_category_id
      LIMIT 1
    ) THEN
      ALTER TABLE products DROP COLUMN main_category_id;
      RAISE NOTICE '[T-13] Coluna products.main_category_id removida';
    ELSE
      RAISE WARNING '[T-13] Existem divergências entre category_id e main_category_id — revisão manual necessária antes de dropar.';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────
-- T-04: Colunas dedicadas para PIX e pagamento
-- Substitui serialização em campo 'notes'
-- ─────────────────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS pix_keys      JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN suppliers.pix_keys IS
  'Array de chaves PIX: [{tipo, chave, favorecido, principal}]. Substitui bloco [Financeiro: PIX:] do campo notes.';
COMMENT ON COLUMN suppliers.payment_methods IS
  'Formas de pagamento aceitas. Substitui bloco [Financeiro: Forma:] do campo notes.';

-- ─────────────────────────────────────────────────
-- T-20: Colunas dedicadas para transportadora padrão
-- Substitui bloco [Transportadora:] do campo notes
-- ─────────────────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS default_carrier_id   UUID  NULL,
  ADD COLUMN IF NOT EXISTS default_carrier_name TEXT  NULL;

COMMENT ON COLUMN suppliers.default_carrier_id IS
  'ID da empresa transportadora padrão no CRM (pgxfvjmuubtbowutlide.companies.id).';
COMMENT ON COLUMN suppliers.default_carrier_name IS
  'Nome da transportadora (cache denormalizado para leitura rápida).';

-- ─────────────────────────────────────────────────
-- T-03: Link para empresa no CRM
-- ─────────────────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS crm_company_id UUID NULL;

COMMENT ON COLUMN suppliers.crm_company_id IS
  'Referência ao company no banco de Empresas (pgxfvjmuubtbowutlide.companies.id).
   Não é FK referencial real (cross-database), mas serve para JOIN manual via API.';

-- ─────────────────────────────────────────────────
-- T-05: Tabela relacional supplier_contacts
-- Substitui campo contacts TEXT (JSON serializado)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  role        TEXT,
  email       TEXT,
  phone       TEXT,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  signature   TEXT,
  nickname    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id
  ON supplier_contacts(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_email
  ON supplier_contacts(email)
  WHERE email IS NOT NULL;

-- Garantir apenas 1 primário por fornecedor
CREATE UNIQUE INDEX IF NOT EXISTS uniq_supplier_contacts_primary
  ON supplier_contacts(supplier_id)
  WHERE is_primary = TRUE;

COMMENT ON TABLE supplier_contacts IS
  'Contatos de fornecedores — substitui campo contacts TEXT (JSON) da tabela suppliers.';

-- ─────────────────────────────────────────────────
-- T-18: Remover coluna duplicada minimum_order_value
-- (duplicata de min_order_value)
-- ─────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'minimum_order_value'
  ) THEN
    -- Sincronizar antes de remover
    UPDATE suppliers
    SET min_order_value = minimum_order_value
    WHERE min_order_value IS NULL AND minimum_order_value IS NOT NULL;

    ALTER TABLE suppliers DROP COLUMN minimum_order_value;
    RAISE NOTICE '[T-18] Coluna suppliers.minimum_order_value removida (duplicata de min_order_value)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────
-- Habilitar RLS na nova tabela
-- ─────────────────────────────────────────────────
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: mesma organização que pode ver suppliers pode ver seus contatos
CREATE POLICY "supplier_contacts_org_access" ON supplier_contacts
  USING (
    supplier_id IN (
      SELECT id FROM suppliers
      -- Ajustar condition de org conforme RLS da tabela suppliers
    )
  );

-- ─────────────────────────────────────────────────
-- Trigger updated_at em supplier_contacts
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_supplier_contacts_updated_at ON supplier_contacts;
CREATE TRIGGER update_supplier_contacts_updated_at
  BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- FIM DA MIGRATION
-- Próximos passos após aplicar:
-- 1. Rodar script de migração de dados (contacts JSON → supplier_contacts)
-- 2. Rodar script de migração PIX/pagamento (notes → pix_keys/payment_methods)
-- 3. Atualizar código front-end para usar novas colunas
-- 4. Remover bloco serializado do buildNotesPayload
-- 5. Após validação: DROP COLUMN contacts; DROP COLUMN _deprecated_active;
-- =====================================================================
