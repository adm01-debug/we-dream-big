-- ============================================================
-- GIFTS STORE - MIGRATION 07 - ESTRUTURA COMPLETA PARA BRINDES
-- Sistema Promobrind - Estrutura perfeita para catálogo
-- Data: 03/01/2025
-- VERSÃO DEFENSIVA: Todas as operações verificam existência das tabelas
-- ============================================================

-- Garantir que a função de atualização de timestamp existe antes dos triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- PARTE 1: ADICIONAR CAMPO product_type EM products
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='product_type') THEN
      ALTER TABLE public.products
      ADD COLUMN product_type TEXT DEFAULT 'simple'
      CHECK (product_type IN ('simple', 'kit', 'component'));
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 2: TABELA product_kit_components
-- Define quais produtos compõem um kit
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    CREATE TABLE IF NOT EXISTS public.product_kit_components (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kit_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      component_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      is_optional BOOLEAN DEFAULT false,
      is_replaceable BOOLEAN DEFAULT false,
      allowed_variant_ids JSONB DEFAULT '[]',
      display_order INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CHECK (kit_product_id != component_product_id),
      UNIQUE(kit_product_id, component_product_id)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_kit_components' AND indexname='idx_kit_components_kit') THEN
      CREATE INDEX idx_kit_components_kit ON public.product_kit_components(kit_product_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_kit_components' AND indexname='idx_kit_components_component') THEN
      CREATE INDEX idx_kit_components_component ON public.product_kit_components(component_product_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='product_kit_components' AND trigger_name='update_product_kit_components_updated_at') THEN
      CREATE TRIGGER update_product_kit_components_updated_at
        BEFORE UPDATE ON public.product_kit_components
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 3: TABELA product_personalization_options
-- Define quais técnicas cada produto aceita e seus preços
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    CREATE TABLE IF NOT EXISTS public.product_personalization_options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      technique_id UUID NOT NULL REFERENCES public.personalization_techniques(id) ON DELETE CASCADE,
      base_price DECIMAL(10,2),
      price_per_color DECIMAL(10,2),
      price_per_position DECIMAL(10,2),
      price_per_unit DECIMAL(10,2),
      min_quantity INTEGER DEFAULT 1,
      max_quantity INTEGER,
      max_print_area JSONB,
      max_colors INTEGER,
      available_positions JSONB DEFAULT '[]',
      production_days INTEGER,
      technical_notes TEXT,
      is_available BOOLEAN DEFAULT true,
      is_recommended BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      UNIQUE(product_id, technique_id)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_personalization_options' AND indexname='idx_personalization_options_product') THEN
      CREATE INDEX idx_personalization_options_product ON public.product_personalization_options(product_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_personalization_options' AND indexname='idx_personalization_options_technique') THEN
      CREATE INDEX idx_personalization_options_technique ON public.product_personalization_options(technique_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_personalization_options' AND indexname='idx_personalization_options_available') THEN
      CREATE INDEX idx_personalization_options_available ON public.product_personalization_options(is_available) WHERE is_available = true;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='product_personalization_options' AND trigger_name='update_product_personalization_options_updated_at') THEN
      CREATE TRIGGER update_product_personalization_options_updated_at
        BEFORE UPDATE ON public.product_personalization_options
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 4: TABELA product_print_areas
-- Define áreas específicas de impressão em cada produto
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    CREATE TABLE IF NOT EXISTS public.product_print_areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      area_name TEXT NOT NULL,
      max_width DECIMAL(10,2) NOT NULL,
      max_height DECIMAL(10,2) NOT NULL,
      unit TEXT DEFAULT 'cm' CHECK (unit IN ('cm', 'mm', 'in')),
      shape TEXT DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'oval', 'custom')),
      position_data JSONB,
      allowed_technique_ids JSONB DEFAULT '[]',
      is_primary BOOLEAN DEFAULT false,
      additional_cost DECIMAL(10,2) DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      example_image_url TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_print_areas' AND indexname='idx_print_areas_product') THEN
      CREATE INDEX idx_print_areas_product ON public.product_print_areas(product_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_print_areas' AND indexname='idx_print_areas_active') THEN
      CREATE INDEX idx_print_areas_active ON public.product_print_areas(is_active) WHERE is_active = true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_print_areas' AND indexname='idx_print_areas_primary') THEN
      CREATE INDEX idx_print_areas_primary ON public.product_print_areas(is_primary) WHERE is_primary = true;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='product_print_areas' AND trigger_name='update_product_print_areas_updated_at') THEN
      CREATE TRIGGER update_product_print_areas_updated_at
        BEFORE UPDATE ON public.product_print_areas
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 5: TABELA product_technique_pricing_tiers
-- Tabela de preços escalonados por quantidade
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    CREATE TABLE IF NOT EXISTS public.product_technique_pricing_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      personalization_option_id UUID NOT NULL REFERENCES public.product_personalization_options(id) ON DELETE CASCADE,
      min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
      max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
      unit_price DECIMAL(10,2) NOT NULL,
      setup_fee DECIMAL(10,2) DEFAULT 0,
      discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_technique_pricing_tiers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='product_technique_pricing_tiers' AND indexname='idx_pricing_tiers_option') THEN
      CREATE INDEX idx_pricing_tiers_option ON public.product_technique_pricing_tiers(personalization_option_id);
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 6: VIEW - Produtos com Técnicas Disponíveis
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.v_products_with_techniques AS
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.product_type,
        p.base_price,
        COALESCE(
          json_agg(
            json_build_object(
              'technique_id', t.id,
              'technique_name', t.name,
              'technique_code', t.code,
              'base_price', po.base_price,
              'price_per_color', po.price_per_color,
              'max_colors', po.max_colors,
              'max_print_area', po.max_print_area,
              'available_positions', po.available_positions,
              'is_recommended', po.is_recommended,
              'production_days', COALESCE(po.production_days, t.production_time_days)
            ) ORDER BY po.display_order, t.name
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as techniques,
        (
          SELECT json_agg(
            json_build_object(
              'area_id', pa.id,
              'area_name', pa.area_name,
              'max_width', pa.max_width,
              'max_height', pa.max_height,
              'unit', pa.unit,
              'is_primary', pa.is_primary
            ) ORDER BY pa.display_order
          )
          FROM public.product_print_areas pa
          WHERE pa.product_id = p.id
            AND pa.is_active = true
        ) as print_areas,
        CASE
          WHEN p.product_type = 'kit' THEN (
            SELECT json_agg(
              json_build_object(
                'component_id', comp.id,
                'component_name', comp.name,
                'component_sku', comp.sku,
                'quantity', kc.quantity,
                'is_optional', kc.is_optional
              ) ORDER BY kc.display_order
            )
            FROM public.product_kit_components kc
            JOIN public.products comp ON comp.id = kc.component_product_id
            WHERE kc.kit_product_id = p.id
          )
          ELSE NULL
        END as kit_components
      FROM public.products p
      LEFT JOIN public.product_personalization_options po ON po.product_id = p.id AND po.is_available = true
      LEFT JOIN public.personalization_techniques t ON t.id = po.technique_id AND t.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id
    $view$;
  END IF;
END $$;

-- ============================================================
-- PARTE 7: FUNCTION - Calcular Preço de Personalização
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_personalization_price(
  p_product_id UUID,
  p_technique_id UUID,
  p_quantity INTEGER,
  p_num_colors INTEGER DEFAULT 1,
  p_num_positions INTEGER DEFAULT 1
)
RETURNS TABLE (
  base_price DECIMAL(10,2),
  color_cost DECIMAL(10,2),
  position_cost DECIMAL(10,2),
  quantity_discount DECIMAL(5,2),
  final_unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2)
) AS $$
DECLARE
  v_option RECORD;
  v_tier RECORD;
  v_base DECIMAL(10,2);
  v_color DECIMAL(10,2);
  v_position DECIMAL(10,2);
  v_discount DECIMAL(5,2) := 0;
  v_unit_price DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT * INTO v_option
  FROM public.product_personalization_options
  WHERE product_id = p_product_id
    AND technique_id = p_technique_id
    AND is_available = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tecnica nao disponivel para este produto';
  END IF;

  v_base := COALESCE(v_option.base_price, 0);
  v_color := COALESCE(v_option.price_per_color, 0) * (p_num_colors - 1);
  v_position := COALESCE(v_option.price_per_position, 0) * (p_num_positions - 1);

  SELECT * INTO v_tier
  FROM public.product_technique_pricing_tiers
  WHERE personalization_option_id = v_option.id
    AND p_quantity >= min_quantity
    AND (max_quantity IS NULL OR p_quantity <= max_quantity)
  ORDER BY min_quantity DESC
  LIMIT 1;

  IF FOUND THEN
    v_unit_price := v_tier.unit_price;
    v_discount := v_tier.discount_percentage;
  ELSE
    v_unit_price := v_base + v_color + v_position;
  END IF;

  IF v_discount > 0 THEN
    v_unit_price := v_unit_price * (1 - v_discount / 100);
  END IF;

  v_total := v_unit_price * p_quantity;

  RETURN QUERY SELECT
    v_base,
    v_color,
    v_position,
    v_discount,
    v_unit_price,
    v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- PARTE 8: SEED DATA - Áreas de Impressão Comuns
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_default_print_areas_for_product(
  p_product_id UUID,
  p_product_category TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_product_category IN ('camisetas', 'polos', 'vestuario') THEN
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Frente', 20, 30, true, 1),
      (p_product_id, 'Costas', 25, 35, false, 2),
      (p_product_id, 'Manga Direita', 10, 10, false, 3),
      (p_product_id, 'Manga Esquerda', 10, 10, false, 4),
      (p_product_id, 'Bolso', 8, 8, false, 5);

  ELSIF p_product_category IN ('canecas', 'copos') THEN
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, shape, is_primary, display_order)
    VALUES
      (p_product_id, 'Frontal', 8, 8, 'rectangle', true, 1),
      (p_product_id, '360', 24, 8, 'rectangle', false, 2);

  ELSIF p_product_category IN ('cadernos', 'agendas') THEN
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Capa Frontal', 15, 21, true, 1),
      (p_product_id, 'Capa Traseira', 15, 21, false, 2),
      (p_product_id, 'Lombada', 2, 21, false, 3);

  ELSIF p_product_category IN ('canetas', 'escrita') THEN
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, shape, is_primary, display_order)
    VALUES
      (p_product_id, 'Corpo', 5, 0.8, 'rectangle', true, 1),
      (p_product_id, 'Clip', 3, 0.5, 'rectangle', false, 2);

  ELSIF p_product_category IN ('mochilas', 'bolsas', 'necessaires') THEN
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Frente', 20, 20, true, 1),
      (p_product_id, 'Bolso Frontal', 15, 15, false, 2),
      (p_product_id, 'Lateral', 10, 20, false, 3);

  ELSE
    INSERT INTO public.product_print_areas
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Area Principal', 10, 10, true, 1);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTE 9: RLS POLICIES
-- ============================================================

-- PRODUCT_KIT_COMPONENTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    ALTER TABLE public.product_kit_components ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_kit_components' AND policyname='org_members_view_kit_components')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_members_view_kit_components"
      ON public.product_kit_components FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_kit_components.kit_product_id
            AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
        )
      );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_kit_components' AND policyname='org_admins_manage_kit_components')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_admins_manage_kit_components"
      ON public.product_kit_components FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_kit_components.kit_product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_kit_components.kit_product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- PRODUCT_PERSONALIZATION_OPTIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    ALTER TABLE public.product_personalization_options ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_personalization_options' AND policyname='org_members_view_personalization_options')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_members_view_personalization_options"
      ON public.product_personalization_options FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_personalization_options.product_id
            AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
        )
      );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_personalization_options' AND policyname='org_admins_manage_personalization_options')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_admins_manage_personalization_options"
      ON public.product_personalization_options FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_personalization_options.product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_personalization_options.product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- PRODUCT_PRINT_AREAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    ALTER TABLE public.product_print_areas ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_print_areas' AND policyname='org_members_view_print_areas')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_members_view_print_areas"
      ON public.product_print_areas FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_print_areas.product_id
            AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
        )
      );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_print_areas' AND policyname='org_admins_manage_print_areas')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_admins_manage_print_areas"
      ON public.product_print_areas FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_print_areas.product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.products
          WHERE id = product_print_areas.product_id
            AND public.is_org_owner_or_admin(organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- PRODUCT_TECHNIQUE_PRICING_TIERS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_technique_pricing_tiers') THEN
    ALTER TABLE public.product_technique_pricing_tiers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_technique_pricing_tiers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_technique_pricing_tiers' AND policyname='org_members_view_pricing_tiers')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_members_view_pricing_tiers"
      ON public.product_technique_pricing_tiers FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.product_personalization_options po
          JOIN public.products p ON p.id = po.product_id
          WHERE po.id = product_technique_pricing_tiers.personalization_option_id
            AND (p.organization_id IS NULL OR public.user_is_org_member(p.organization_id))
        )
      );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_technique_pricing_tiers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_technique_pricing_tiers' AND policyname='org_admins_manage_pricing_tiers')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='organization_id') THEN
      CREATE POLICY "org_admins_manage_pricing_tiers"
      ON public.product_technique_pricing_tiers FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.product_personalization_options po
          JOIN public.products p ON p.id = po.product_id
          WHERE po.id = product_technique_pricing_tiers.personalization_option_id
            AND public.is_org_owner_or_admin(p.organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.product_personalization_options po
          JOIN public.products p ON p.id = po.product_id
          WHERE po.id = product_technique_pricing_tiers.personalization_option_id
            AND public.is_org_owner_or_admin(p.organization_id)
        )
      );
    END IF;
  END IF;
END $$;

-- ============================================================
-- PARTE 10: GRANTS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_kit_components') THEN
    GRANT SELECT ON public.product_kit_components TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_personalization_options') THEN
    GRANT SELECT ON public.product_personalization_options TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_print_areas') THEN
    GRANT SELECT ON public.product_print_areas TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_technique_pricing_tiers') THEN
    GRANT SELECT ON public.product_technique_pricing_tiers TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='v_products_with_techniques') THEN
    GRANT SELECT ON public.v_products_with_techniques TO authenticated;
  END IF;
END $$;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT
  'Migration 07 executada com sucesso!' as message,
  'Sistema COMPLETO para catalogo de brindes promocionais' as status,
  '4 novas tabelas + 1 view + funcoes + RLS' as summary;
