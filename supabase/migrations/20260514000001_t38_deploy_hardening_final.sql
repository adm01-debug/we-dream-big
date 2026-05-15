-- ============================================================
-- MIGRATION: t38 — Deploy Hardening Final (2026-05-14)
-- Análise exaustiva pré-deploy Promo Gifts
-- Executada por 5 sub-agentes coordenados
-- Migration defensiva: usa IF EXISTS em todos os objetos
-- ============================================================

-- -------------------------------------------------------
-- BLOCO 1: SEGURANÇA — Revogar EXECUTE desnecessário de
-- funções SECURITY DEFINER do role 'authenticated'
-- -------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_above'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.is_admin_or_above(_user_id uuid) FROM authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_coord_or_above'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.is_coord_or_above(_user_id uuid) FROM authenticated;
  END IF;
END $$;

-- -------------------------------------------------------
-- BLOCO 2: SEGURANÇA — Consolidar políticas duplicadas
-- em audit_log
-- -------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    DROP POLICY IF EXISTS audit_log_admin_only ON public.audit_log;
    DROP POLICY IF EXISTS audit_log_select_supervisor ON public.audit_log;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'audit_log'
        AND policyname = 'audit_log_select_supervisor_or_above'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY audit_log_select_supervisor_or_above
          ON public.audit_log
          FOR SELECT
          TO authenticated
          USING (is_supervisor_or_above((SELECT auth.uid())))
      $policy$;
    END IF;
  END IF;
END $$;

-- -------------------------------------------------------
-- BLOCO 3: PERFORMANCE — DROP de 17 índices duplicados
-- (IF EXISTS garante no-op quando já removidos)
-- -------------------------------------------------------

DROP INDEX IF EXISTS public.idx_ai_provider_quotas_period;
DROP INDEX IF EXISTS public.idx_ai_providers_slug;
DROP INDEX IF EXISTS public.idx_approval_links_token;
DROP INDEX IF EXISTS public.idx_mockup_credits_user_id;
DROP INDEX IF EXISTS public.idx_spr_product;
DROP INDEX IF EXISTS public.idx_product_ai_history_product_version;
DROP INDEX IF EXISTS public.idx_media_pending;
DROP INDEX IF EXISTS public.idx_product_images_color;
DROP INDEX IF EXISTS public.idx_product_images_variant;
DROP INDEX IF EXISTS public.idx_stock_snapshots_captured_brin;
DROP INDEX IF EXISTS public.idx_image_validation_log_validated_brin;
DROP INDEX IF EXISTS public.idx_spr_supplier_sku;
DROP INDEX IF EXISTS public.idx_supplier_image_req_code;
DROP INDEX IF EXISTS public.variant_stocks_variant_id_idx;
DROP INDEX IF EXISTS public.idx_favorite_lists_shared_token;
DROP INDEX IF EXISTS public.idx_user_comparisons_token;
DROP INDEX IF EXISTS public.idx_product_videos_cloudflare_id;

-- -------------------------------------------------------
-- BLOCO 4: MANUTENÇÃO — Autovacuum scale_factor 20% → 5%
-- -------------------------------------------------------

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'product_relationships',
    'image_validation_log',
    'product_commemorative_dates',
    'image_import_log',
    'product_tags',
    'product_category_assignments',
    'product_variants',
    'product_materials'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I SET (
           autovacuum_vacuum_scale_factor = 0.05,
           autovacuum_analyze_scale_factor = 0.02
         )', t
      );
    END IF;
  END LOOP;

  -- cost_limit apenas para product_relationships (tabela maior)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_relationships'
  ) THEN
    ALTER TABLE public.product_relationships
      SET (autovacuum_vacuum_cost_limit = 2000);
  END IF;
END $$;

-- -------------------------------------------------------
-- BLOCO 5: INTEGRIDADE — Índice para FK residual
-- -------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_providers'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ai_providers_created_by
      ON public.ai_providers (created_by);
  END IF;
END $$;
