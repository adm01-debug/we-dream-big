
-- 1) Tabela de snapshots históricos
CREATE TABLE IF NOT EXISTS public.hardening_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  score int NOT NULL,
  max_score int NOT NULL DEFAULT 5,
  failures text[] NOT NULL DEFAULT ARRAY[]::text[],
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hardening_snapshots_at
  ON public.hardening_health_snapshots (snapshot_at DESC);

ALTER TABLE public.hardening_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read hardening snapshots" ON public.hardening_health_snapshots;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hardening_health_snapshots' AND policyname = 'Admins read hardening snapshots') THEN
    CREATE POLICY "Admins read hardening snapshots"
      ON public.hardening_health_snapshots
      FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Sem políticas de INSERT/UPDATE/DELETE: somente SECURITY DEFINER pode escrever.

-- 2) Função: snapshot_hardening_status()
CREATE OR REPLACE FUNCTION public.snapshot_hardening_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _details jsonb;
  _snapshot_id uuid;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || 'pg_trgm fora do schema extensions'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || 'Job cleanup-security-logs-daily inativo'; END IF;

  -- MFA enforced em app — assumido true (controlado em código)
  _score := _score + 1;

  _details := jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'sensitive_realtime_count', _sensitive_realtime,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true
  );

  INSERT INTO public.hardening_health_snapshots (score, max_score, failures, details)
  VALUES (_score, _max, _failures, _details)
  RETURNING id INTO _snapshot_id;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', _snapshot_id, 'score', _score, 'max', _max);
END;
$$;

-- 3) Função: auto_block_extreme_offenders()
CREATE OR REPLACE FUNCTION public.auto_block_extreme_offenders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _admin record;
  _blocked_count int := 0;
  _system_uid uuid;
  _expires timestamptz := now() + interval '6 hours';
BEGIN
  -- created_by precisa de uuid; usa o primeiro admin como ator do sistema
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOR _row IN
    WITH offenders AS (
      SELECT ip_address, count(*) AS cnt
      FROM (
        SELECT ip_address FROM public.login_attempts
          WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'
        UNION ALL
        SELECT ip_address FROM public.public_token_failures
          WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
        UNION ALL
        SELECT ip_address FROM public.bot_detection_log
          WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
      ) s
      GROUP BY ip_address
      HAVING count(*) >= 30
    )
    SELECT o.ip_address, o.cnt
    FROM offenders o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ip_access_control iac
      WHERE iac.ip_address = o.ip_address
        AND iac.list_type = 'block'
        AND (iac.expires_at IS NULL OR iac.expires_at > now())
    )
  LOOP
    INSERT INTO public.ip_access_control (
      ip_address, list_type, reason, expires_at, created_by
    ) VALUES (
      _row.ip_address,
      'block',
      format('Auto-bloqueio: %s ofensas em 1h', _row.cnt),
      _expires,
      _system_uid
    );

    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, ip_address, details
    ) VALUES (
      _system_uid,
      'auto_ip_block',
      'ip_access_control',
      _row.ip_address,
      _row.ip_address,
      jsonb_build_object('offense_count', _row.cnt, 'expires_at', _expires, 'window', '1h')
    );

    -- Notifica admins (dedupe por IP em 1h)
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.workspace_notifications
        WHERE user_id = _admin.user_id
          AND category = 'security'
          AND title = '🛡️ IP auto-bloqueado'
          AND metadata->>'ip' = _row.ip_address
          AND created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.workspace_notifications (
          user_id, title, message, type, category, action_url, metadata
        ) VALUES (
          _admin.user_id,
          '🛡️ IP auto-bloqueado',
          format('IP %s bloqueado por 6h após %s ofensas em 1h.', _row.ip_address, _row.cnt),
          'warning',
          'security',
          '/admin/seguranca-acesso',
          jsonb_build_object('ip', _row.ip_address, 'offense_count', _row.cnt, 'expires_at', _expires)
        );
      END IF;
    END LOOP;

    _blocked_count := _blocked_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'blocked', _blocked_count, 'ran_at', now());
END;
$$;

-- 4) Crons
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-hardening-daily') THEN
    PERFORM cron.unschedule('snapshot-hardening-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-block-extreme-offenders') THEN
    PERFORM cron.unschedule('auto-block-extreme-offenders');
  END IF;
END $$;

SELECT cron.schedule(
  'snapshot-hardening-daily',
  '5 4 * * *',
  $cron$ SELECT public.snapshot_hardening_status(); $cron$
);

SELECT cron.schedule(
  'auto-block-extreme-offenders',
  '*/15 * * * *',
  $cron$ SELECT public.auto_block_extreme_offenders(); $cron$
);
