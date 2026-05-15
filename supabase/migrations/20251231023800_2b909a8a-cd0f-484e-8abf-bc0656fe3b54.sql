
-- Criar tabela de roles para RBAC
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir roles padrão
INSERT INTO public.roles (name, description) VALUES 
  ('admin', 'Administrador com acesso total'),
  ('manager', 'Gerente com acesso a relatórios e aprovações'),
  ('seller', 'Vendedor com acesso básico'),
  ('viewer', 'Visualizador apenas leitura')
ON CONFLICT (name) DO NOTHING;

-- Adicionar coluna role_id na tabela profiles se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);
  END IF;
END $$;

-- Definir role padrão (seller) para profiles existentes
UPDATE public.profiles 
SET role_id = (SELECT id FROM public.roles WHERE name = 'seller')
WHERE role_id IS NULL;

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policies para roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'Roles are viewable by authenticated users') THEN
    CREATE POLICY "Roles are viewable by authenticated users"
    ON public.roles
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'Only admins can manage roles') THEN
    CREATE POLICY "Only admins can manage roles"
    ON public.roles
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.user_id = auth.uid() AND r.name = 'admin'
      )
    );
  END IF;
END $$;
