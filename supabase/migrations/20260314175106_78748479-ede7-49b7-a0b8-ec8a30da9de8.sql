CREATE TABLE IF NOT EXISTS public.video_variant_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  variant_id text NOT NULL,
  variant_name text,
  variant_color_hex text,
  supplier_code text,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, variant_id)
);

ALTER TABLE public.video_variant_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_variant_links' AND policyname = 'Authenticated users can read video variant links') THEN
    CREATE POLICY "Authenticated users can read video variant links"
      ON public.video_variant_links FOR SELECT
      TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_variant_links' AND policyname = 'Admins can manage video variant links') THEN
    CREATE POLICY "Admins can manage video variant links"
      ON public.video_variant_links FOR ALL
      TO authenticated USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;
