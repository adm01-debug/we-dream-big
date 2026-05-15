-- Create storage bucket used by product media uploads
insert into storage.buckets (id, name, public)
select 'personalization-images', 'personalization-images', true
where not exists (
  select 1 from storage.buckets where id = 'personalization-images'
);

-- Public read access for product media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view personalization images'
  ) THEN
    DROP POLICY IF EXISTS "Public can view personalization images" ON storage.objects;
    CREATE POLICY "Public can view personalization images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'personalization-images');
  END IF;
END
$$;

-- Authenticated users can upload media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload personalization images'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can upload personalization images" ON storage.objects;
    CREATE POLICY "Authenticated users can upload personalization images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'personalization-images');
  END IF;
END
$$;

-- Authenticated users can update their own uploaded media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can update own personalization images'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can update own personalization images" ON storage.objects;
    CREATE POLICY "Authenticated users can update own personalization images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'personalization-images' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'personalization-images' AND owner = auth.uid());
  END IF;
END
$$;

-- Authenticated users can delete their own uploaded media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete own personalization images'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can delete own personalization images" ON storage.objects;
    CREATE POLICY "Authenticated users can delete own personalization images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'personalization-images' AND owner = auth.uid());
  END IF;
END
$$;