-- T40: Fix all ERROR-level advisor violations
-- Targets: security_definer_view (2) + rls_disabled_in_public (10) + sensitive_columns_exposed (1)
-- All statements are idempotent / guarded.

-- ── security_definer_view ──────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_product_novelties') THEN
    ALTER VIEW public.v_product_novelties SET (security_invoker = true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_color_hierarchy') THEN
    ALTER VIEW public.v_color_hierarchy SET (security_invoker = true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── rls_disabled_in_public ────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE public.webhook_configs      ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.webhook_logs         ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.user_sessions        ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.product_variants     ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.product_reviews      ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.collection_products  ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.client_contacts      ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.client_notes         ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.quote_versions       ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE public.reward_redemptions   ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
