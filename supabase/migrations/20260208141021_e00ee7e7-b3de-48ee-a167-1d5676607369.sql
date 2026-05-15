-- Create storage bucket for art files (CorelDraw, PDF)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'art-files') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('art-files', 'art-files', true);
  END IF;
END $$;

-- Allow authenticated users to upload art files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload art files') THEN
    CREATE POLICY "Authenticated users can upload art files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Allow authenticated users to view their own art files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own art files') THEN
    CREATE POLICY "Users can view their own art files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Allow public read access for art files (needed for preview/download links)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for art files') THEN
    CREATE POLICY "Public read access for art files"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = 'art-files');
  END IF;
END $$;

-- Allow users to delete their own art files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own art files') THEN
    CREATE POLICY "Users can delete their own art files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Create table to track art file attachments linked to mockup jobs
CREATE TABLE IF NOT EXISTS public.art_file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT,
  product_name TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.art_file_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users can view their own art files') THEN
    CREATE POLICY "Users can view their own art files"
    ON public.art_file_attachments
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users can insert their own art files') THEN
    CREATE POLICY "Users can insert their own art files"
    ON public.art_file_attachments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users can delete their own art files') THEN
    CREATE POLICY "Users can delete their own art files"
    ON public.art_file_attachments
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;
