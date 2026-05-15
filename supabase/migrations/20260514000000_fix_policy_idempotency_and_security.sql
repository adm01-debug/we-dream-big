-- =============================================================================
-- Fix: idempotency, RLS security gaps e redundant index
-- Corrige políticas em migrations anteriores já aplicadas sem alterar seus
-- arquivos (evita checksum mismatch no Supabase Preview CI).
--
-- GUARD: todas as operações são protegidas com verificação de existência de
-- tabela para que a migration aplique sem erro mesmo quando as tabelas não
-- existem no banco (ex: ambientes de preview que partem de um schema diferente
-- do histórico Lovable completo).
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. product_novelties — "Service can manage novelties" deve ser service_role only
--    (sem TO o anon também poderia escrever via token de serviço)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_novelties') THEN
    DROP POLICY IF EXISTS "Service can manage novelties" ON public.product_novelties;
    CREATE POLICY "Service can manage novelties" ON public.product_novelties
        FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CRM tables — SELECT policies precisam de TO authenticated
--    (sem TO, anon também vê dados de CRM)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
    CREATE POLICY "Authenticated users can view companies"
      ON public.companies FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_contacts') THEN
    DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.company_contacts;
    CREATE POLICY "Authenticated users can view contacts"
      ON public.company_contacts FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_phones') THEN
    DROP POLICY IF EXISTS "Authenticated users can view phones" ON public.contact_phones;
    CREATE POLICY "Authenticated users can view phones"
      ON public.contact_phones FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_emails') THEN
    DROP POLICY IF EXISTS "Authenticated users can view emails" ON public.contact_emails;
    CREATE POLICY "Authenticated users can view emails"
      ON public.contact_emails FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_addresses') THEN
    DROP POLICY IF EXISTS "Authenticated users can view addresses" ON public.company_addresses;
    CREATE POLICY "Authenticated users can view addresses"
      ON public.company_addresses FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. organization_members INSERT bootstrap — restringe a user_id = auth.uid()
--    e role = 'owner' para evitar que qualquer autenticado tome posse de orgs vazias.
--
--    SECURITY FIX: NOT EXISTS dentro de WITH CHECK é avaliado sob RLS do chamador.
--    Um usuário não-membro não enxerga membros existentes → NOT EXISTS retorna true
--    → ele consegue se inserir como owner. Corrigido com função SECURITY DEFINER
--    que bypassa RLS e vê a tabela inteira.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members') THEN
    CREATE OR REPLACE FUNCTION public.org_has_any_members(_org_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id = _org_id)
    $fn$;

    DROP POLICY IF EXISTS "Org admins/owners can insert members" ON public.organization_members;
    CREATE POLICY "Org admins/owners can insert members"
      ON public.organization_members FOR INSERT TO authenticated
      WITH CHECK (
        public.has_org_role(auth.uid(), organization_id, 'owner')
        OR public.has_org_role(auth.uid(), organization_id, 'admin')
        OR (
          NOT public.org_has_any_members(organization_id)
          AND user_id = auth.uid()
          AND role = 'owner'
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Remove índice redundante: UNIQUE constraint em organizations.slug
--    já cria índice implicitamente — o CREATE INDEX explícito era desnecessário
-- ──────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_organizations_slug;
