
-- Create table for simulator wizard drafts
CREATE TABLE IF NOT EXISTS public.simulator_wizard_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Rascunho',
  product_data JSONB NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 100,
  personalizations JSONB NOT NULL DEFAULT '[]'::jsonb,
  wizard_step TEXT NOT NULL DEFAULT 'product',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulator_wizard_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'simulator_wizard_drafts' AND policyname = 'Users can view their own drafts') THEN
    CREATE POLICY "Users can view their own drafts"
    ON public.simulator_wizard_drafts FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'simulator_wizard_drafts' AND policyname = 'Users can create their own drafts') THEN
    CREATE POLICY "Users can create their own drafts"
    ON public.simulator_wizard_drafts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'simulator_wizard_drafts' AND policyname = 'Users can update their own drafts') THEN
    CREATE POLICY "Users can update their own drafts"
    ON public.simulator_wizard_drafts FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'simulator_wizard_drafts' AND policyname = 'Users can delete their own drafts') THEN
    CREATE POLICY "Users can delete their own drafts"
    ON public.simulator_wizard_drafts FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_simulator_wizard_drafts_updated_at ON public.simulator_wizard_drafts;
CREATE TRIGGER update_simulator_wizard_drafts_updated_at
BEFORE UPDATE ON public.simulator_wizard_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
