-- ========== mockup_prompt_configs ==========
CREATE TABLE IF NOT EXISTS public.mockup_prompt_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  ai_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image-preview',
  technique_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mockup_prompt_configs_key ON public.mockup_prompt_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_mockup_prompt_configs_technique ON public.mockup_prompt_configs(technique_id);

ALTER TABLE public.mockup_prompt_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_configs' AND policyname = 'Admins manage prompt configs') THEN
    CREATE POLICY "Admins manage prompt configs"
      ON public.mockup_prompt_configs FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_mockup_prompt_configs_updated_at ON public.mockup_prompt_configs;
CREATE TRIGGER update_mockup_prompt_configs_updated_at
  BEFORE UPDATE ON public.mockup_prompt_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== mockup_prompt_history ==========
CREATE TABLE IF NOT EXISTS public.mockup_prompt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.mockup_prompt_configs(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  old_prompt TEXT,
  new_prompt TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  version INTEGER NOT NULL,
  changed_by UUID,
  change_notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mockup_prompt_history_config ON public.mockup_prompt_history(config_id, changed_at DESC);

ALTER TABLE public.mockup_prompt_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_history' AND policyname = 'Admins view prompt history') THEN
    CREATE POLICY "Admins view prompt history"
      ON public.mockup_prompt_history FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_history' AND policyname = 'Admins insert prompt history') THEN
    CREATE POLICY "Admins insert prompt history"
      ON public.mockup_prompt_history FOR INSERT
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ========== Trigger de versionamento automático ==========
CREATE OR REPLACE FUNCTION public.log_mockup_prompt_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.prompt_text IS DISTINCT FROM NEW.prompt_text OR OLD.ai_model IS DISTINCT FROM NEW.ai_model) THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.mockup_prompt_history (
      config_id, config_key, old_prompt, new_prompt, ai_model, version, changed_by
    ) VALUES (
      NEW.id, NEW.config_key, OLD.prompt_text, NEW.prompt_text, NEW.ai_model, NEW.version, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_mockup_prompt_change ON public.mockup_prompt_configs;
CREATE TRIGGER trg_log_mockup_prompt_change
  BEFORE UPDATE ON public.mockup_prompt_configs
  FOR EACH ROW EXECUTE FUNCTION public.log_mockup_prompt_change();