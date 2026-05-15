
-- Table for user saved filter presets
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  context TEXT NOT NULL DEFAULT 'catalog',
  is_default BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to saved_filters if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_filters' AND column_name='filters') THEN
    ALTER TABLE public.saved_filters ADD COLUMN filters JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_filters' AND column_name='context') THEN
    ALTER TABLE public.saved_filters ADD COLUMN context TEXT NOT NULL DEFAULT 'catalog';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_filters' AND column_name='icon') THEN
    ALTER TABLE public.saved_filters ADD COLUMN icon TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_filters' AND column_name='color') THEN
    ALTER TABLE public.saved_filters ADD COLUMN color TEXT;
  END IF;
END $$;

-- RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_filters' AND policyname = 'Users can view own filters') THEN
    CREATE POLICY "Users can view own filters"
      ON public.saved_filters FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_filters' AND policyname = 'Users can insert own filters') THEN
    CREATE POLICY "Users can insert own filters"
      ON public.saved_filters FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_filters' AND policyname = 'Users can update own filters') THEN
    CREATE POLICY "Users can update own filters"
      ON public.saved_filters FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_filters' AND policyname = 'Users can delete own filters') THEN
    CREATE POLICY "Users can delete own filters"
      ON public.saved_filters FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_context ON public.saved_filters(user_id, context);
