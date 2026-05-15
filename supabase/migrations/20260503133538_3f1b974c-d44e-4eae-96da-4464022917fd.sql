-- 1. Tabela para rastrear revogações globais de tokens
CREATE TABLE IF NOT EXISTS public.user_token_revocations (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.user_token_revocations ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas sua própria revogação, supervisores veem tudo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_token_revocations' AND policyname = 'Users can view own revocation') THEN
    CREATE POLICY "Users can view own revocation" ON public.user_token_revocations
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_token_revocations' AND policyname = 'Supervisors can manage revocations') THEN
    CREATE POLICY "Supervisors can manage revocations" ON public.user_token_revocations
      FOR ALL TO authenticated USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- 2. Função para revogar todos os tokens de um usuário (forçar logout global)
CREATE OR REPLACE FUNCTION public.revoke_all_user_tokens(_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_token_revocations (user_id, revoked_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Auditoria de Logout (opcional, registra na admin_audit_log se houver integração)
-- (Esta parte depende de como o logout é chamado, geralmente via client SDK)
