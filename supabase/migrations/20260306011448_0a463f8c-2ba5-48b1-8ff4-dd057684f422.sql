
CREATE TABLE IF NOT EXISTS public.simulator_wizard_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Rascunho',
  product_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity integer NOT NULL DEFAULT 100,
  personalizations jsonb NOT NULL DEFAULT '[]'::jsonb,
  wizard_step text NOT NULL DEFAULT 'product',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulator_wizard_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulator_wizard_drafts' AND policyname='Users can view own drafts') THEN
    CREATE POLICY "Users can view own drafts"
      ON public.simulator_wizard_drafts
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulator_wizard_drafts' AND policyname='Users can insert own drafts') THEN
    CREATE POLICY "Users can insert own drafts"
      ON public.simulator_wizard_drafts
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulator_wizard_drafts' AND policyname='Users can update own drafts') THEN
    CREATE POLICY "Users can update own drafts"
      ON public.simulator_wizard_drafts
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='simulator_wizard_drafts' AND policyname='Users can delete own drafts') THEN
    CREATE POLICY "Users can delete own drafts"
      ON public.simulator_wizard_drafts
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
