
-- Create storage bucket for product videos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-videos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'product-videos',
      'product-videos',
      true,
      104857600, -- 100MB limit for videos
      ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/ogg']
    );
  END IF;
END $$;

-- Allow authenticated users to upload videos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload videos') THEN
    CREATE POLICY "Authenticated users can upload videos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-videos');
  END IF;
END $$;

-- Allow public read access to videos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view product videos') THEN
    CREATE POLICY "Public can view product videos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'product-videos');
  END IF;
END $$;

-- Allow authenticated users to delete their uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete videos') THEN
    CREATE POLICY "Authenticated users can delete videos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-videos');
  END IF;
END $$;
