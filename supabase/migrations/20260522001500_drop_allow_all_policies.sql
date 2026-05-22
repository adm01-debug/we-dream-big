-- ============================================================================
-- QA HARDENING — Drop "Allow all" RLS policies on production tables
-- ============================================================================
--
-- CONTEXTO:
--   A migration 20250102000000_gifts_production.sql (linhas 87-94) criou:
--     CREATE POLICY "Allow all" ON public.{products,categories,suppliers,quotes}
--       FOR ALL USING (true);
--
--   Em RLS do Postgres, policies permissivas se combinam por OR. Logo, mesmo
--   com as policies restritivas posteriores (org-based em 20250103020000 e
--   role-based em 20250103100000), a "Allow all" permite SELECT/INSERT/UPDATE/
--   DELETE para qualquer cliente — inclusive anon — expondo:
--     - PII de clientes em `quotes` (nome, email, telefone, CNPJ)
--     - Catálogo gravável por anônimos (`products`, `categories`, `suppliers`)
--
--   Achado registrado em docs/AUDIT_FRONTEND_DATABASE_summary.md como CRÍTICO
--   sem resolução até hoje. Verificado por grep em todas as 708 migrations:
--   nenhuma DROP POLICY "Allow all" foi aplicada posteriormente.
--
-- AÇÃO:
--   Remover as 4 policies. As policies restritivas pré-existentes assumem o
--   controle de acesso (org member / admin / manager). Esta migration é
--   idempotente (IF EXISTS) e segura para re-execução.
--
-- ROLLBACK:
--   Reaplicar 20250102000000_gifts_production.sql NÃO restaura — recria as
--   policies (DROP IF EXISTS + CREATE no mesmo bloco). Em emergência:
--     CREATE POLICY "Allow all" ON public.<tabela> FOR ALL USING (true);
--   (apenas como medida emergencial; reabre a brecha)
-- ============================================================================

DROP POLICY IF EXISTS "Allow all" ON public.products;
DROP POLICY IF EXISTS "Allow all" ON public.categories;
DROP POLICY IF EXISTS "Allow all" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all" ON public.quotes;

-- Garantia: RLS continua ativo nas 4 tabelas (foi habilitado na migration
-- original). Re-emitir ENABLE é no-op porém defensivo.
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes      ENABLE ROW LEVEL SECURITY;
