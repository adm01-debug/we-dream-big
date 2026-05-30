-- ============================================================================
-- RLS de ESCRITA para print_area_techniques e supplier_branches (Plano A / PR#3)
-- ----------------------------------------------------------------------------
-- Contexto (CORRECAO-07):
--   O Plano A roteia a escrita de admin pela camada REST nativa (PostgREST + RLS),
--   substituindo a Edge Function bridge (morta). A auditoria das 13 tabelas-base
--   gravadas pelos hooks de admin mostrou que 11 JA possuem policies de escrita
--   (products, suppliers, categories, product_variants, variant_supplier_sources,
--    collections, collection_products, tecnicas_gravacao, tabela_preco_gravacao_oficial).
--
--   Restavam 2 GAPS — escrita autenticada negada por falta de policy:
--     1. print_area_techniques: so tinha `pat_all_service` (service_role). Admin
--        autenticado nao conseguia inserir/atualizar/excluir via REST nativo.
--     2. supplier_branches: nenhuma policy de escrita -> toda escrita negada.
--
--   Nenhuma das duas tem organization_id propria; ambas sao FILHAS de uma tabela
--   que tem. Portanto espelhamos EXATAMENTE o modelo de seguranca do irmao direto,
--   checando a org pelo pai:
--     - print_area_techniques (product_id)  -> espelha product_variants (via products)
--     - supplier_branches    (supplier_id)  -> espelha suppliers
--
--   (tecnica_gravacao_variante e fornecedor_gravacao foram verificadas e NAO existem
--    como tabelas; ficam de fora — escrita a elas falha LOUD, nunca silenciosa.)
--
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE. A policy de service_role
-- (`pat_all_service`) NAO e tocada. Reversivel: basta dropar as policies criadas aqui.
-- ============================================================================

-- RLS ja esta habilitado nas duas (no-op idempotente, por garantia).
ALTER TABLE public.print_area_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_branches     ENABLE ROW LEVEL SECURITY;

-- ── print_area_techniques (filha de products via product_id) ────────────
-- Espelha product_variants: insert/update via user_is_org_member, delete via
-- is_org_owner_or_admin, sempre resolvendo a org pelo produto-pai.

DROP POLICY IF EXISTS pat_org_insert ON public.print_area_techniques;
CREATE POLICY pat_org_insert ON public.print_area_techniques
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = print_area_techniques.product_id
        AND user_is_org_member(p.organization_id)
    )
  );

DROP POLICY IF EXISTS pat_org_update ON public.print_area_techniques;
CREATE POLICY pat_org_update ON public.print_area_techniques
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = print_area_techniques.product_id
        AND user_is_org_member(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = print_area_techniques.product_id
        AND user_is_org_member(p.organization_id)
    )
  );

DROP POLICY IF EXISTS pat_org_delete ON public.print_area_techniques;
CREATE POLICY pat_org_delete ON public.print_area_techniques
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = print_area_techniques.product_id
        AND is_org_owner_or_admin(p.organization_id)
    )
  );

-- ── supplier_branches (filha de suppliers via supplier_id) ───────────────
-- Espelha suppliers: insert/update/delete via is_org_owner_or_admin, resolvendo a
-- org pelo fornecedor-pai.

DROP POLICY IF EXISTS supplier_branches_org_insert ON public.supplier_branches;
CREATE POLICY supplier_branches_org_insert ON public.supplier_branches
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_branches.supplier_id
        AND is_org_owner_or_admin(s.organization_id)
    )
  );

DROP POLICY IF EXISTS supplier_branches_org_update ON public.supplier_branches;
CREATE POLICY supplier_branches_org_update ON public.supplier_branches
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_branches.supplier_id
        AND is_org_owner_or_admin(s.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_branches.supplier_id
        AND is_org_owner_or_admin(s.organization_id)
    )
  );

DROP POLICY IF EXISTS supplier_branches_org_delete ON public.supplier_branches;
CREATE POLICY supplier_branches_org_delete ON public.supplier_branches
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_branches.supplier_id
        AND is_org_owner_or_admin(s.organization_id)
    )
  );
