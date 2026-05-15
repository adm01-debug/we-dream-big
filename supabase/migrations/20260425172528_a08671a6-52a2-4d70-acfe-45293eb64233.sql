-- 1) Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.external_connections_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by_user_id UUID,
  triggered_by_secret_name TEXT,
  trigger_op TEXT,                  -- 'INSERT' | 'UPDATE' | 'DELETE' | 'manual'
  processed INT NOT NULL DEFAULT 0,
  created_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',-- 'ok' | 'error' | 'no_admin'
  error_message TEXT,
  duration_ms INT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_conn_sync_log_ran_at
  ON public.external_connections_sync_log (ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_conn_sync_log_secret
  ON public.external_connections_sync_log (triggered_by_secret_name);

ALTER TABLE public.external_connections_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read external_connections_sync_log"
  ON public.external_connections_sync_log;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'external_connections_sync_log' AND policyname = 'Admins read external_connections_sync_log') THEN
    CREATE POLICY "Admins read external_connections_sync_log"
      ON public.external_connections_sync_log
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Sem políticas de INSERT/UPDATE/DELETE: somente SECURITY DEFINER pode escrever.

-- 2) Função de sync com contagem create/update e auditoria
CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials(
  _trigger_secret_name TEXT DEFAULT NULL,
  _trigger_op TEXT DEFAULT 'manual',
  _trigger_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_anon boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
  _created int := 0;
  _updated int := 0;
  _is_insert boolean;
  _start timestamptz := clock_timestamp();
  _result jsonb;
  _err text;
BEGIN
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message,
      duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      0, 0, 0, 'no_admin', 'no_admin_for_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;

      IF _has_url AND _has_svc THEN
        _status := 'active';
      ELSE
        _status := 'unconfigured';
      END IF;

      _name := CASE _env_key
        WHEN 'promobrind' THEN 'Catálogo Promobrind'
        WHEN 'crm' THEN 'CRM Promobrind'
        ELSE initcap(_env_key)
      END;

      -- Detecta se é INSERT ou UPDATE para contagem
      SELECT NOT EXISTS (
        SELECT 1 FROM public.external_connections
        WHERE env_key = _env_key AND type = 'supabase'
      ) INTO _is_insert;

      INSERT INTO public.external_connections (
        type, name, env_key, config, secret_refs, status, created_by
      ) VALUES (
        'supabase',
        _name,
        _env_key,
        jsonb_build_object('mirrored_from', 'integration_credentials'),
        ARRAY[_url_name, _anon_name, _svc_name],
        _status,
        _system_uid
      )
      ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status,
          secret_refs = EXCLUDED.secret_refs,
          name = EXCLUDED.name,
          updated_at = now();

      IF _is_insert THEN
        _created := _created + 1;
      ELSE
        _updated := _updated + 1;
      END IF;
      _processed := _processed + 1;
    END LOOP;

    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status,
      duration_ms, details
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'ok',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int,
      jsonb_build_object('env_keys', _env_keys)
    );

    _result := jsonb_build_object(
      'ok', true,
      'processed', _processed,
      'created', _created,
      'updated', _updated,
      'ran_at', now()
    );
    RETURN _result;

  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message,
      duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      _processed, _created, _updated, 'error', _err,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RAISE;
  END;
END;
$$;

-- 3) Trigger atualizado para repassar metadados
CREATE OR REPLACE FUNCTION public.trg_sync_external_connections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _secret_name text;
  _op text := TG_OP;
BEGIN
  _secret_name := COALESCE(NEW.secret_name, OLD.secret_name);
  IF (TG_OP = 'DELETE' AND OLD.secret_name LIKE 'EXTERNAL_%')
     OR (TG_OP IN ('INSERT','UPDATE') AND NEW.secret_name LIKE 'EXTERNAL_%') THEN
    PERFORM public.sync_external_connections_from_credentials(
      _secret_name, _op, auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_external_connections_on_credential_change
  ON public.integration_credentials;

DROP TRIGGER IF EXISTS sync_external_connections_on_credential_change ON public.integration_credentials;
CREATE TRIGGER sync_external_connections_on_credential_change
AFTER INSERT OR UPDATE OR DELETE ON public.integration_credentials
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_external_connections();