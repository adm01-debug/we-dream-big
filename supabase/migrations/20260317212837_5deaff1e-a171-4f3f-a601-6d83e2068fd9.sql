
-- Create quote_comments table with thread support
CREATE TABLE IF NOT EXISTS public.quote_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.quote_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to quote_comments if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_comments' AND column_name='parent_id') THEN
    ALTER TABLE public.quote_comments ADD COLUMN parent_id UUID REFERENCES public.quote_comments(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_comments' AND column_name='content') THEN
    ALTER TABLE public.quote_comments ADD COLUMN content TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_comments' AND column_name='is_edited') THEN
    ALTER TABLE public.quote_comments ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all comments (team collaboration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Authenticated users can read comments') THEN
    CREATE POLICY "Authenticated users can read comments"
    ON public.quote_comments
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Users can insert their own comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can insert own comments') THEN
    CREATE POLICY "Users can insert own comments"
    ON public.quote_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Users can update their own comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can update own comments') THEN
    CREATE POLICY "Users can update own comments"
    ON public.quote_comments
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Users can delete own comments, admins can delete any
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments"
    ON public.quote_comments
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_comments_quote_id ON public.quote_comments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_parent_id ON public.quote_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_user_id ON public.quote_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_created_at ON public.quote_comments(created_at DESC);
