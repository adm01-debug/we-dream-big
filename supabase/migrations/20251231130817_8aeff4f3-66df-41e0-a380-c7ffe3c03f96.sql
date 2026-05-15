-- Tabela para configurações de bloqueio geográfico (países permitidos)
CREATE TABLE IF NOT EXISTS public.geo_allowed_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code CHAR(2) NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.geo_allowed_countries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'geo_allowed_countries' AND policyname = 'Anyone can view allowed countries') THEN
    CREATE POLICY "Anyone can view allowed countries"
    ON public.geo_allowed_countries
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'geo_allowed_countries' AND policyname = 'Admins can manage allowed countries') THEN
    CREATE POLICY "Admins can manage allowed countries"
    ON public.geo_allowed_countries
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Tabela para configurações globais de segurança
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_settings' AND policyname = 'Anyone can view security settings') THEN
    CREATE POLICY "Anyone can view security settings"
    ON public.security_settings
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_settings' AND policyname = 'Admins can manage security settings') THEN
    CREATE POLICY "Admins can manage security settings"
    ON public.security_settings
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Inserir configuração padrão de bloqueio geográfico (desabilitado por padrão)
INSERT INTO public.security_settings (setting_key, setting_value, description)
VALUES ('geo_blocking', '{"enabled": false, "mode": "whitelist"}'::jsonb, 'Configurações de bloqueio geográfico');

-- Adicionar Brasil como país permitido por padrão
INSERT INTO public.geo_allowed_countries (country_code, country_name)
VALUES ('BR', 'Brasil');