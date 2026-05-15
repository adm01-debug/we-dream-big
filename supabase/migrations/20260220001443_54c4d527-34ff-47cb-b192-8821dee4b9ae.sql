
-- Tabela de IPs permitidos (whitelist)
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  label TEXT, -- ex: "Escritório SP", "Home Office João"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ip_address)
);

-- Tabela de cidades permitidas (whitelist)
CREATE TABLE IF NOT EXISTS public.city_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  state TEXT, -- ex: "SP", "RJ"
  country_code TEXT NOT NULL DEFAULT 'BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(city_name, state, country_code)
);

-- Log de acessos bloqueados
CREATE TABLE IF NOT EXISTS public.access_blocked_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  ip_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  block_reason TEXT NOT NULL, -- 'ip_not_whitelisted', 'city_not_whitelisted'
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configuração global de segurança de acesso
CREATE TABLE IF NOT EXISTS public.access_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
  city_whitelist_enabled BOOLEAN NOT NULL DEFAULT false,
  block_unknown_locations BOOLEAN NOT NULL DEFAULT false,
  max_failed_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 15,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão (tudo desabilitado por segurança)
INSERT INTO public.access_security_settings (id, ip_whitelist_enabled, city_whitelist_enabled)
VALUES (gen_random_uuid(), false, false);

-- Enable RLS em todas as tabelas
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_blocked_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_security_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Apenas admin/manager podem gerenciar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ip_whitelist' AND policyname = 'Admin can manage ip_whitelist') THEN
    CREATE POLICY "Admin can manage ip_whitelist" ON public.ip_whitelist
      FOR ALL USING (public.can_manage(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'city_whitelist' AND policyname = 'Admin can manage city_whitelist') THEN
    CREATE POLICY "Admin can manage city_whitelist" ON public.city_whitelist
      FOR ALL USING (public.can_manage(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'access_blocked_log' AND policyname = 'Admin can view access_blocked_log') THEN
    CREATE POLICY "Admin can view access_blocked_log" ON public.access_blocked_log
      FOR SELECT USING (public.can_manage(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'access_security_settings' AND policyname = 'Admin can manage access_security_settings') THEN
    CREATE POLICY "Admin can manage access_security_settings" ON public.access_security_settings
      FOR ALL USING (public.can_manage(auth.uid()));
  END IF;
END $$;

-- Service role precisa inserir logs (via edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'access_blocked_log' AND policyname = 'Service can insert blocked logs') THEN
    CREATE POLICY "Service can insert blocked logs" ON public.access_blocked_log
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_ip_whitelist_updated_at ON public.ip_whitelist;
CREATE TRIGGER update_ip_whitelist_updated_at
  BEFORE UPDATE ON public.ip_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_city_whitelist_updated_at ON public.city_whitelist;
CREATE TRIGGER update_city_whitelist_updated_at
  BEFORE UPDATE ON public.city_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_access_security_settings_updated_at ON public.access_security_settings;
CREATE TRIGGER update_access_security_settings_updated_at
  BEFORE UPDATE ON public.access_security_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
