-- Tabela de log de tentativas negadas por RLS (defense-in-depth observability)
CREATE TABLE IF NOT EXISTS public.rls_denial_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_role TEXT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('SELECT','INSERT','UPDATE','DELETE')),
  endpoint TEXT,                     -- caminho da rota / hook que originou a chamada
  query_summary TEXT,                -- descrição curta (filtros, ids alvo, etc.)
  target_id UUID,                    -- registro alvo, quando aplicável
  target_seller_id UUID,             -- dono do registro, quando conhecido
  policy_hint TEXT,                  -- política inferida (ex.: "quotes_select_scope")
  error_code TEXT,
  error_message TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rls_denial_user ON public.rls_denial_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rls_denial_table ON public.rls_denial_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rls_denial_created ON public.rls_denial_log (created_at DESC);

ALTER TABLE public.rls_denial_log ENABLE ROW LEVEL SECURITY;

-- Apenas admin/supervisor leem; ninguém faz INSERT direto (só via RPC security definer)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rls_denial_log' AND policyname = 'Admins read rls denials') THEN
    CREATE POLICY "Admins read rls denials"
      ON public.rls_denial_log FOR SELECT
      TO authenticated
      USING (is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rls_denial_log' AND policyname = 'Block direct insert') THEN
    CREATE POLICY "Block direct insert"
      ON public.rls_denial_log FOR INSERT
      TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rls_denial_log' AND policyname = 'Block direct update') THEN
    CREATE POLICY "Block direct update"
      ON public.rls_denial_log FOR UPDATE
      TO authenticated
      USING (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rls_denial_log' AND policyname = 'Admins can delete old logs') THEN
    CREATE POLICY "Admins can delete old logs"
      ON public.rls_denial_log FOR DELETE
      TO authenticated
      USING (is_admin_strict(auth.uid()));
  END IF;
END $$;

-- RPC para qualquer usuário autenticado registrar SUA própria negação
CREATE OR REPLACE FUNCTION public.log_rls_denial(
  p_table_name TEXT,
  p_operation TEXT,
  p_endpoint TEXT DEFAULT NULL,
  p_query_summary TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_seller_id UUID DEFAULT NULL,
  p_policy_hint TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_role TEXT;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_operation NOT IN ('SELECT','INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION 'invalid_operation';
  END IF;

  -- enriquece com email + papel principal (best-effort)
  SELECT email, role INTO v_email, v_role
  FROM public.profiles
  WHERE user_id = v_uid
  LIMIT 1;

  INSERT INTO public.rls_denial_log (
    user_id, user_email, user_role, table_name, operation,
    endpoint, query_summary, target_id, target_seller_id,
    policy_hint, error_code, error_message, user_agent
  ) VALUES (
    v_uid, v_email, v_role, p_table_name, p_operation,
    p_endpoint, p_query_summary, p_target_id, p_target_seller_id,
    p_policy_hint, p_error_code, p_error_message, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_rls_denial(
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_rls_denial(
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated;