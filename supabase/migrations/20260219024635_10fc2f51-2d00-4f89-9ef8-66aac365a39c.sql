
-- Allow authenticated users to upload PDFs to art-files bucket (quotes folder)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload to art-files') THEN
    CREATE POLICY "Authenticated users can upload to art-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'art-files');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update art-files') THEN
    CREATE POLICY "Authenticated users can update art-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'art-files');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can read art-files') THEN
    CREATE POLICY "Authenticated users can read art-files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'art-files');
  END IF;
END $$;
