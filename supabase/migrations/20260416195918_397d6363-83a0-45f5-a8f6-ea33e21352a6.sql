-- ========== mockup_templates ==========
CREATE TABLE IF NOT EXISTS public.mockup_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_id TEXT,
  product_name TEXT,
  technique_id TEXT,
  technique_name TEXT,
  personalization_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mockup_templates_user ON public.mockup_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_mockup_templates_product ON public.mockup_templates(product_id);

ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users view own mockup templates') THEN
    CREATE POLICY "Users view own mockup templates"
      ON public.mockup_templates FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users insert own mockup templates') THEN
    CREATE POLICY "Users insert own mockup templates"
      ON public.mockup_templates FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users update own mockup templates') THEN
    CREATE POLICY "Users update own mockup templates"
      ON public.mockup_templates FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users delete own mockup templates') THEN
    CREATE POLICY "Users delete own mockup templates"
      ON public.mockup_templates FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_mockup_templates_updated_at ON public.mockup_templates;
CREATE TRIGGER update_mockup_templates_updated_at
  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== art_file_attachments ==========
CREATE TABLE IF NOT EXISTS public.art_file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mockup_id UUID,
  quote_id UUID,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  file_extension TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='mockup_id') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN mockup_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='quote_id') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN quote_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='file_url') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN file_url TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='file_path') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN file_path TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='original_name') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN original_name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='mime_type') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN mime_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='file_size_bytes') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN file_size_bytes BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='file_extension') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN file_extension TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='notes') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='art_file_attachments' AND column_name='updated_at') THEN
    ALTER TABLE public.art_file_attachments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_art_files_user ON public.art_file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_art_files_mockup ON public.art_file_attachments(mockup_id);
CREATE INDEX IF NOT EXISTS idx_art_files_quote ON public.art_file_attachments(quote_id);

ALTER TABLE public.art_file_attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users view own art files') THEN
    CREATE POLICY "Users view own art files"
      ON public.art_file_attachments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users insert own art files') THEN
    CREATE POLICY "Users insert own art files"
      ON public.art_file_attachments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users update own art files') THEN
    CREATE POLICY "Users update own art files"
      ON public.art_file_attachments FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'art_file_attachments' AND policyname = 'Users delete own art files') THEN
    CREATE POLICY "Users delete own art files"
      ON public.art_file_attachments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_art_files_updated_at ON public.art_file_attachments;
CREATE TRIGGER update_art_files_updated_at
  BEFORE UPDATE ON public.art_file_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Storage bucket para arquivos vetoriais ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-art-files', 'mockup-art-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users view own art files in storage') THEN
    CREATE POLICY "Users view own art files in storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload own art files to storage') THEN
    CREATE POLICY "Users upload own art files to storage"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users update own art files in storage') THEN
    CREATE POLICY "Users update own art files in storage"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users delete own art files in storage') THEN
    CREATE POLICY "Users delete own art files in storage"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
