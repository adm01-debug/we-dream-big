-- Create personalization locations table
CREATE TABLE IF NOT EXISTS public.personalization_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_type TEXT NOT NULL,
  location_name TEXT NOT NULL,
  code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personalization sizes table
CREATE TABLE IF NOT EXISTS public.personalization_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE CASCADE,
  technique_code TEXT,
  size_label TEXT NOT NULL,
  width_cm NUMERIC(6,2),
  height_cm NUMERIC(6,2),
  area_cm2 NUMERIC(10,2),
  price_modifier NUMERIC(5,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personalization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_locations' AND policyname = 'Authenticated users can view locations') THEN
    CREATE POLICY "Authenticated users can view locations"
      ON public.personalization_locations FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_locations' AND policyname = 'Admins can manage locations') THEN
    CREATE POLICY "Admins can manage locations"
      ON public.personalization_locations FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS Policies for sizes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_sizes' AND policyname = 'Authenticated users can view sizes') THEN
    CREATE POLICY "Authenticated users can view sizes"
      ON public.personalization_sizes FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_sizes' AND policyname = 'Admins can manage sizes') THEN
    CREATE POLICY "Admins can manage sizes"
      ON public.personalization_sizes FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personalization_locations_product_type ON public.personalization_locations(product_type);
CREATE INDEX IF NOT EXISTS idx_personalization_sizes_technique_id ON public.personalization_sizes(technique_id);
CREATE INDEX IF NOT EXISTS idx_personalization_sizes_technique_code ON public.personalization_sizes(technique_code);