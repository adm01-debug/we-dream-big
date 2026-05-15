
-- Create mockup_templates table for synced custom templates
CREATE TABLE IF NOT EXISTS public.mockup_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_templates' AND column_name='user_id') THEN
    ALTER TABLE public.mockup_templates ADD COLUMN user_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_templates' AND column_name='name') THEN
    ALTER TABLE public.mockup_templates ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mockup_templates' AND column_name='areas') THEN
    ALTER TABLE public.mockup_templates ADD COLUMN areas JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users can view own templates') THEN
    CREATE POLICY "Users can view own templates"
      ON public.mockup_templates FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users can create own templates') THEN
    CREATE POLICY "Users can create own templates"
      ON public.mockup_templates FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users can update own templates') THEN
    CREATE POLICY "Users can update own templates"
      ON public.mockup_templates FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'Users can delete own templates') THEN
    CREATE POLICY "Users can delete own templates"
      ON public.mockup_templates FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mockup_templates_updated_at ON public.mockup_templates;
CREATE TRIGGER update_mockup_templates_updated_at
  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add annotations column to generated_mockups
ALTER TABLE public.generated_mockups
  ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '[]'::jsonb;
