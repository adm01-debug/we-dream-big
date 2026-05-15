-- Tabela para armazenar configurações 2FA dos usuários
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  totp_secret TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes TEXT[],
  enabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para IPs permitidos por usuário
CREATE TABLE IF NOT EXISTS public.user_allowed_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, ip_address)
);

-- Tabela para logs de tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_allowed_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policies para user_2fa_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_2fa_settings' AND policyname = 'Users can view their own 2FA settings') THEN
    CREATE POLICY "Users can view their own 2FA settings"
      ON public.user_2fa_settings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_2fa_settings' AND policyname = 'Users can manage their own 2FA settings') THEN
    CREATE POLICY "Users can manage their own 2FA settings"
      ON public.user_2fa_settings FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policies para user_allowed_ips
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_allowed_ips' AND policyname = 'Users can view their own allowed IPs') THEN
    CREATE POLICY "Users can view their own allowed IPs"
      ON public.user_allowed_ips FOR SELECT
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_allowed_ips' AND policyname = 'Users can manage their own allowed IPs') THEN
    CREATE POLICY "Users can manage their own allowed IPs"
      ON public.user_allowed_ips FOR ALL
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Policies para login_attempts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_attempts' AND policyname = 'Users can view their own login attempts') THEN
    CREATE POLICY "Users can view their own login attempts"
      ON public.login_attempts FOR SELECT
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_attempts' AND policyname = 'Service can create login attempts') THEN
    CREATE POLICY "Service can create login attempts"
      ON public.login_attempts FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Função para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_2fa_settings_updated_at ON public.user_2fa_settings;
CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();