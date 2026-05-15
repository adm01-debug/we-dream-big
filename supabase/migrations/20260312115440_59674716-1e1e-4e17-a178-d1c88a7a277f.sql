
CREATE TABLE IF NOT EXISTS public.generated_mockups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  client_id text,
  client_name text,
  product_id text,
  product_name text,
  product_sku text,
  technique_id text,
  technique_name text,
  logo_url text,
  mockup_url text,
  layout_url text,
  position_x numeric,
  position_y numeric,
  logo_width_cm numeric,
  logo_height_cm numeric,
  location_name text,
  colors_count integer,
  annotations jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can manage own mockups') THEN
    CREATE POLICY "Users can manage own mockups"
      ON public.generated_mockups
      FOR ALL
      TO authenticated
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;
