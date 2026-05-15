
-- Tabela para gerenciar prompts de mockup
CREATE TABLE IF NOT EXISTS public.mockup_prompt_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE, -- 'main_prompt', 'technique_<id>', etc.
  label TEXT NOT NULL, -- Nome amigável
  prompt_text TEXT NOT NULL,
  ai_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image-preview',
  is_active BOOLEAN NOT NULL DEFAULT true,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de versões
CREATE TABLE IF NOT EXISTS public.mockup_prompt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.mockup_prompt_configs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_notes TEXT
);

-- Enable RLS
ALTER TABLE public.mockup_prompt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mockup_prompt_history ENABLE ROW LEVEL SECURITY;

-- Policies: only admin/manager can manage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_configs' AND policyname = 'Admins can manage prompt configs') THEN
    CREATE POLICY "Admins can manage prompt configs"
    ON public.mockup_prompt_configs FOR ALL
    USING (public.can_manage(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_history' AND policyname = 'Admins can manage prompt history') THEN
    CREATE POLICY "Admins can manage prompt history"
    ON public.mockup_prompt_history FOR ALL
    USING (public.can_manage(auth.uid()));
  END IF;
END $$;

-- Sellers can read active configs (edge function needs this)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_configs' AND policyname = 'Authenticated users can read active configs') THEN
    CREATE POLICY "Authenticated users can read active configs"
    ON public.mockup_prompt_configs FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_prompt_history' AND policyname = 'Authenticated users can read history') THEN
    CREATE POLICY "Authenticated users can read history"
    ON public.mockup_prompt_history FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_mockup_prompt_configs_updated_at ON public.mockup_prompt_configs;
CREATE TRIGGER update_mockup_prompt_configs_updated_at
BEFORE UPDATE ON public.mockup_prompt_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default main prompt
INSERT INTO public.mockup_prompt_configs (config_key, label, prompt_text, ai_model) VALUES
('main_prompt', 'Prompt Principal do Mockup', 'You are a professional product mockup generator. Apply the provided company logo onto the product image at the EXACT position specified.

Product: {{productName}}
Technique: {{techniquePrompt}}

EXACT LOGO POSITION (this is critical, do NOT deviate):
- Horizontal: {{positionX}}% from the left edge ({{horizontalPos}})
- Vertical: {{positionY}}% from the top edge ({{verticalPos}})
- The logo must be placed at EXACTLY this coordinate on the product surface: {{positionDesc}}
- Logo size: {{sizeDesc}} (approximately {{logoWidthCm}}cm x {{logoHeightCm}}cm)
{{scaleInstruction}}
{{rotationInstruction}}

STRICT RULES - MUST FOLLOW ALL:
1. Place the logo at EXACTLY the specified position ({{positionX}}% horizontal, {{positionY}}% vertical). This is the most important rule.
2. DO NOT move the logo to a different location than specified.
3. DO NOT change the product size, proportions, dimensions, framing, or crop in any way.
4. The output must have the exact same composition and scale as the input product image.
5. The logo should follow the contours/curves of the product surface naturally.
6. Apply realistic lighting and shadows matching the product.
7. Maintain identical background, lighting, and photography style.

Output the final image maintaining the exact same dimensions and aspect ratio as the original product photo.', 'google/gemini-2.5-flash-image-preview');
