-- ========== product_sync_logs ==========
CREATE TABLE IF NOT EXISTS public.product_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  payload JSONB,
  error_message TEXT,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='created_at') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='source') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'n8n';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='records_processed') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN records_processed INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='records_inserted') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN records_inserted INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='records_updated') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN records_updated INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='records_failed') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN records_failed INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='duration_ms') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN duration_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='payload') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN payload JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_sync_logs' AND column_name='triggered_by') THEN
    ALTER TABLE public.product_sync_logs ADD COLUMN triggered_by UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_sync_logs_created ON public.product_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sync_logs_source ON public.product_sync_logs(source, status);

ALTER TABLE public.product_sync_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_sync_logs' AND policyname = 'Admins view product sync logs') THEN
    CREATE POLICY "Admins view product sync logs"
      ON public.product_sync_logs FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_sync_logs' AND policyname = 'Admins insert product sync logs') THEN
    CREATE POLICY "Admins insert product sync logs"
      ON public.product_sync_logs FOR INSERT
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ========== product_component_locations ==========
CREATE TABLE IF NOT EXISTS public.product_component_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.product_components(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  location_name TEXT NOT NULL,
  description TEXT,
  max_width_cm NUMERIC(6,2),
  max_height_cm NUMERIC(6,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(component_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_product_comp_loc_component ON public.product_component_locations(component_id);

ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_locations' AND policyname = 'Authenticated view component locations') THEN
    CREATE POLICY "Authenticated view component locations"
      ON public.product_component_locations FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_component_locations' AND policyname = 'Admins manage component locations') THEN
    CREATE POLICY "Admins manage component locations"
      ON public.product_component_locations FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_product_comp_loc_updated_at ON public.product_component_locations;
CREATE TRIGGER update_product_comp_loc_updated_at
  BEFORE UPDATE ON public.product_component_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();