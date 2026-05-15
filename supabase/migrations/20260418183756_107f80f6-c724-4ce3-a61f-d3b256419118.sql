-- ============================================
-- 1. Enriquecer custom_kits com identidade visual
-- ============================================
ALTER TABLE public.custom_kits
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'Package',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_custom_kits_user_favorite
  ON public.custom_kits (user_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS idx_custom_kits_tag ON public.custom_kits (tag);

-- ============================================
-- 2. Tabela kit_templates (Kits Sugeridos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Geral',
  color text NOT NULL DEFAULT '#3B82F6',
  icon text NOT NULL DEFAULT 'Package',
  tag text,
  cover_image_url text,
  box_data jsonb,
  items_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  personalization_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_price numeric NOT NULL DEFAULT 0,
  volume_usage_percent numeric NOT NULL DEFAULT 0,
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kit_templates_active_category
  ON public.kit_templates (is_active, category);
CREATE INDEX IF NOT EXISTS idx_kit_templates_usage
  ON public.kit_templates (usage_count DESC) WHERE is_active = true;

ALTER TABLE public.kit_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_templates' AND policyname = 'Authenticated users can view active templates') THEN
    CREATE POLICY "Authenticated users can view active templates"
      ON public.kit_templates FOR SELECT
      TO authenticated
      USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_templates' AND policyname = 'Admins can insert templates') THEN
    CREATE POLICY "Admins can insert templates"
      ON public.kit_templates FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_templates' AND policyname = 'Admins can update templates') THEN
    CREATE POLICY "Admins can update templates"
      ON public.kit_templates FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_templates' AND policyname = 'Admins can delete templates') THEN
    CREATE POLICY "Admins can delete templates"
      ON public.kit_templates FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_kit_templates_updated_at ON public.kit_templates;
CREATE TRIGGER trg_kit_templates_updated_at
  BEFORE UPDATE ON public.kit_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. RPC pública para incrementar usage_count
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_kit_template_usage(_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.kit_templates
  SET usage_count = usage_count + 1
  WHERE id = _template_id AND is_active = true;
END;
$$;