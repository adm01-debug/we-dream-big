-- Criar tabela para armazenar emojis/ícones das categorias
CREATE TABLE IF NOT EXISTS public.category_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view category icons
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'category_icons' AND policyname = 'Anyone can view category icons') THEN
    CREATE POLICY "Anyone can view category icons"
    ON public.category_icons
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Policy: Admins can manage category icons
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'category_icons' AND policyname = 'Admins can manage category icons') THEN
    CREATE POLICY "Admins can manage category icons"
    ON public.category_icons
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Inserir categorias com emojis baseados nas imagens
INSERT INTO public.category_icons (category_name, icon) VALUES
('BAR | COZINHA', '🍷'),
('FERRAMENTAS | UTILIDADES', '🔧'),
('AGRO', '🌾'),
('CHAVEIROS', '🔑'),
('ECOLOGIA', '🌿'),
('EMBALAGENS', '📦'),
('ESPORTES | AVENTURA | LAZER', '⚽'),
('FESTAS | EVENTOS', '🎉'),
('JOGOS E BRINQUEDOS', '🎮'),
('KIT GOURMET', '🍳'),
('PAPELARIA | ESCRITÓRIO', '📝'),
('PET CARE', '🐾'),
('MOTIVACIONAL | PREMIAÇÕES', '🏆'),
('ROUPAS | CALÇADOS | ACESSÓRIOS', '👕'),
('SAÚDE | BELEZA | BEM ESTAR', '💆'),
('TECNOLOGIA | ELETRÔNICOS', '📱'),
('UTENSÍLIOS | DECORAÇÃO', '🏠'),
('VEÍCULOS', '🚗'),
('PORTA CANETA', '✏️'),
('Kits', '🎁'),
('Bar | Cozinha', '🍷'),
('Ferramentas | Utilidades', '🔧'),
('Agro', '🌾'),
('Ecologia', '🌿'),
('Embalagens', '📦'),
('Esportes | Aventura | Lazer | Viagem', '⚽'),
('Festas | Eventos', '🎉'),
('Jogos e Brinquedos', '🎮'),
('Kit Gourmet', '🍳'),
('Papelaria | Escritório', '📝'),
('Pet Care', '🐾'),
('Motivacional | Premiações', '🏆'),
('Roupas | Calçados | Acessórios', '👕'),
('Saúde | Beleza | Bem Estar', '💆'),
('Tecnologia | Eletrônicos', '📱'),
('Utensílios | Decoração', '🏠'),
('Veículos', '🚗')
ON CONFLICT (category_name) DO UPDATE SET icon = EXCLUDED.icon;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_category_icons_updated_at ON public.category_icons;
CREATE TRIGGER update_category_icons_updated_at
BEFORE UPDATE ON public.category_icons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();