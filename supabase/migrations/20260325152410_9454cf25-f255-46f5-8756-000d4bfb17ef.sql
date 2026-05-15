
-- Storage bucket for component media
INSERT INTO storage.buckets (id, name, public)
VALUES ('component-media', 'component-media', true)
ON CONFLICT (id) DO NOTHING;

-- Table to store media metadata for kit components
CREATE TABLE IF NOT EXISTS public.component_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.component_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'component_media' AND policyname = 'Admins can manage component media') THEN
    CREATE POLICY "Admins can manage component media"
      ON public.component_media
      FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'component_media' AND policyname = 'Authenticated users can read component media') THEN
    CREATE POLICY "Authenticated users can read component media"
      ON public.component_media
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Storage policies for component-media bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload component media') THEN
    CREATE POLICY "Admins can upload component media"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'component-media' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update component media') THEN
    CREATE POLICY "Admins can update component media"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'component-media' AND has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (bucket_id = 'component-media' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete component media') THEN
    CREATE POLICY "Admins can delete component media"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'component-media' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can read component media') THEN
    CREATE POLICY "Anyone can read component media"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'component-media');
  END IF;
END $$;
