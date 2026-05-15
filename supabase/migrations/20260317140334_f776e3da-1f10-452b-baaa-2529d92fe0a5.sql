-- Create supplier-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to supplier-logos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload supplier logos') THEN
    CREATE POLICY "Authenticated users can upload supplier logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'supplier-logos');
  END IF;
END $$;

-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for supplier logos') THEN
    CREATE POLICY "Public read access for supplier logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'supplier-logos');
  END IF;
END $$;

-- Allow authenticated users to update/delete their uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can manage supplier logos') THEN
    CREATE POLICY "Authenticated users can manage supplier logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'supplier-logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update supplier logos') THEN
    CREATE POLICY "Authenticated users can update supplier logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'supplier-logos');
  END IF;
END $$;
