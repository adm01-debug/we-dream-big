
-- Tabela para persistir imagens publicitárias geradas pelo Magic Up
CREATE TABLE IF NOT EXISTS public.magic_up_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_color TEXT,
  technique_name TEXT,
  location_name TEXT,
  scene_title TEXT,
  scene_category TEXT,
  scene_prompt TEXT NOT NULL,
  custom_prompt TEXT,
  product_image_url TEXT,
  logo_url TEXT,
  generated_image_url TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  client_id UUID REFERENCES public.bitrix_clients(id),
  client_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.magic_up_generations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own generations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_generations' AND policyname = 'Users can view own generations') THEN
    CREATE POLICY "Users can view own generations"
      ON public.magic_up_generations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_generations' AND policyname = 'Users can insert own generations') THEN
    CREATE POLICY "Users can insert own generations"
      ON public.magic_up_generations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_generations' AND policyname = 'Users can update own generations') THEN
    CREATE POLICY "Users can update own generations"
      ON public.magic_up_generations FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_generations' AND policyname = 'Users can delete own generations') THEN
    CREATE POLICY "Users can delete own generations"
      ON public.magic_up_generations FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index for listing by user
CREATE INDEX IF NOT EXISTS idx_magic_up_generations_user ON public.magic_up_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_generations_favorite ON public.magic_up_generations(user_id, is_favorite) WHERE is_favorite = true;
