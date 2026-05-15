-- Tabela de componentes por produto
CREATE TABLE IF NOT EXISTS public.product_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  component_name TEXT NOT NULL,
  component_code TEXT NOT NULL,
  is_personalizable BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, component_code)
);

-- Tabela de localizações por componente
CREATE TABLE IF NOT EXISTS public.product_component_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES public.product_components(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  location_code TEXT NOT NULL,
  max_area_cm2 NUMERIC(10,2),
  max_width_cm NUMERIC(6,2),
  max_height_cm NUMERIC(6,2),
  area_image_url TEXT,
  printing_lines_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(component_id, location_code)
);

-- Tabela de técnicas disponíveis por localização
CREATE TABLE IF NOT EXISTS public.product_component_location_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_location_id UUID REFERENCES public.product_component_locations(id) ON DELETE CASCADE NOT NULL,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE CASCADE NOT NULL,
  composed_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  composed_location_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(component_location_id, technique_id)
);

-- Enable RLS
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_component_location_techniques ENABLE ROW LEVEL SECURITY;

-- RLS Policies para product_components
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_components' AND policyname = 'Authenticated users can view components') THEN
    CREATE POLICY "Authenticated users can view components"
      ON public.product_components FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_components' AND policyname = 'Admins can manage components') THEN
    CREATE POLICY "Admins can manage components"
      ON public.product_components FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS Policies para product_component_locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_locations' AND policyname = 'Authenticated users can view component locations') THEN
    CREATE POLICY "Authenticated users can view component locations"
      ON public.product_component_locations FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_locations' AND policyname = 'Admins can manage component locations') THEN
    CREATE POLICY "Admins can manage component locations"
      ON public.product_component_locations FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS Policies para product_component_location_techniques
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_location_techniques' AND policyname = 'Authenticated users can view location techniques') THEN
    CREATE POLICY "Authenticated users can view location techniques"
      ON public.product_component_location_techniques FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_location_techniques' AND policyname = 'Admins can manage location techniques') THEN
    CREATE POLICY "Admins can manage location techniques"
      ON public.product_component_location_techniques FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_product_components_product_id ON public.product_components(product_id);
CREATE INDEX IF NOT EXISTS idx_product_component_locations_component_id ON public.product_component_locations(component_id);
CREATE INDEX IF NOT EXISTS idx_product_component_location_techniques_location_id ON public.product_component_location_techniques(component_location_id);
CREATE INDEX IF NOT EXISTS idx_product_component_location_techniques_technique_id ON public.product_component_location_techniques(technique_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_product_components_updated_at ON public.product_components;
CREATE TRIGGER update_product_components_updated_at
  BEFORE UPDATE ON public.product_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();