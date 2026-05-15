-- ============================================================
-- 1. Tabela de log de auto-revogações
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mcp_key_auto_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES public.mcp_api_keys(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('trigger','cron','manual')),
  reason TEXT NOT NULL DEFAULT 'creator_lost_dev_role',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_auto_rev_key ON public.mcp_key_auto_revocations(key_id);
CREATE INDEX IF NOT EXISTS idx_mcp_auto_rev_user ON public.mcp_key_auto_revocations(created_by, revoked_at DESC);

ALTER TABLE public.mcp_key_auto_revocations ENABLE ROW LEVEL SECURITY;

-- Apenas devs podem ver
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_key_auto_revocations' AND policyname = 'Devs can view auto-revocations') THEN
    CREATE POLICY "Devs can view auto-revocations"
      ON public.mcp_key_auto_revocations
      FOR SELECT
      USING (public.is_dev(auth.uid()));
  END IF;
END $$;

-- Sem políticas de INSERT/UPDATE/DELETE: somente funções SECURITY DEFINER
-- (auto_revoke_orphan_full_keys) podem escrever, contornando RLS.

-- ============================================================
-- 2. Função principal de varredura/revogação
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_revoke_orphan_full_keys(_source TEXT DEFAULT 'cron')
RETURNS TABLE(key_id UUID, created_by UUID, revoked_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  IF _source NOT IN ('trigger','cron','manual') THEN
    RAISE EXCEPTION 'invalid source: %', _source USING ERRCODE = '22023';
  END IF;

  FOR _rec IN
    SELECT k.id, k.created_by
      FROM public.mcp_api_keys k
     WHERE k.revoked_at IS NULL
       AND '*' = ANY(k.scopes)
       AND NOT public.is_dev(k.created_by)
     FOR UPDATE
  LOOP
    -- Revoga a chave (trigger existente log_mcp_key_revocation registra a mudança)
    UPDATE public.mcp_api_keys
       SET revoked_at = _now,
           updated_at = _now
     WHERE id = _rec.id
       AND revoked_at IS NULL;

    -- Log dedicado do mecanismo de defesa
    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, _rec.created_by, _now, _source, 'creator_lost_dev_role');

    -- Correlação forense no audit log de step-up (mesma trilha das emissões FULL)
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      _rec.created_by,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object(
        'reason', 'creator_lost_dev_role',
        'source', _source
      )
    );

    key_id := _rec.id;
    created_by := _rec.created_by;
    revoked_at := _now;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_revoke_orphan_full_keys(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_revoke_orphan_full_keys(TEXT) TO postgres, service_role;

-- ============================================================
-- 3. Trigger reativo em user_roles (latência zero)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_auto_revoke_mcp_on_role_loss()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  -- Só agimos quando uma role 'dev' é removida E o usuário não tem outra linha 'dev'
  IF OLD.role IS DISTINCT FROM 'dev'::app_role THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = OLD.user_id AND role = 'dev'::app_role
  ) THEN
    -- Ainda é dev por outra atribuição: nada a fazer
    RETURN OLD;
  END IF;

  FOR _rec IN
    SELECT id FROM public.mcp_api_keys
     WHERE created_by = OLD.user_id
       AND revoked_at IS NULL
       AND '*' = ANY(scopes)
     FOR UPDATE
  LOOP
    UPDATE public.mcp_api_keys
       SET revoked_at = _now, updated_at = _now
     WHERE id = _rec.id AND revoked_at IS NULL;

    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, OLD.user_id, _now, 'trigger', 'creator_lost_dev_role');

    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      OLD.user_id,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object('reason','creator_lost_dev_role','source','trigger')
    );
  END LOOP;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_auto_revoke_mcp ON public.user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_auto_revoke_mcp ON public.user_roles;
CREATE TRIGGER trg_user_roles_auto_revoke_mcp
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_revoke_mcp_on_role_loss();

-- ============================================================
-- 4. Cron defensivo (a cada 15 min)
-- ============================================================
DO $$
BEGIN
  -- remove job antigo se existir (idempotente)
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'auto-revoke-orphan-mcp-full-keys';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-revoke-orphan-mcp-full-keys',
  '*/15 * * * *',
  $cron$ SELECT public.auto_revoke_orphan_full_keys('cron'); $cron$
);