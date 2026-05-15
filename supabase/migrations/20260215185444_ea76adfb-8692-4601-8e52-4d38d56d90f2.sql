
-- Create storage bucket for mockup assets (logos, generated mockups)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-assets', 'mockup-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view mockup assets (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view mockup assets') THEN
    CREATE POLICY "Anyone can view mockup assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'mockup-assets');
  END IF;
END $$;

-- Authenticated users can upload to their own folder
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own mockup assets') THEN
    CREATE POLICY "Users can upload their own mockup assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'mockup-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Users can update their own assets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own mockup assets') THEN
    CREATE POLICY "Users can update their own mockup assets"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'mockup-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Users can delete their own assets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own mockup assets') THEN
    CREATE POLICY "Users can delete their own mockup assets"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'mockup-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
