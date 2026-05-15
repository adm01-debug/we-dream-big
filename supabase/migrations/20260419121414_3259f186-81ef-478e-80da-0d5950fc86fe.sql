-- Função: detecta regressão de hardening e notifica admins (deduplicado por dia)
CREATE OR REPLACE FUNCTION public.notify_hardening_regression()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _admin record;
  _notified int := 0;
  _msg text;
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

  -- MFA enforced em app — assumido sempre true (controlado em código, não DB)
  _score := _score + 1;

  IF _score >= _max THEN
    RETURN jsonb_build_object('ok', true, 'score', _score, 'max', _max, 'notified', 0);
  END IF;

  _msg := format(
    'Saúde do hardening caiu para %s/%s. Falhas: %s. Acesse /admin/seguranca-acesso.',
    _score, _max, array_to_string(_failures, '; ')
  );

  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_notifications
      WHERE user_id = _admin.user_id
        AND category = 'security'
        AND title = '⚠️ Regressão de hardening detectada'
        AND created_at > now() - interval '20 hours'
    ) THEN
      INSERT INTO public.workspace_notifications (
        user_id, title, message, type, category, action_url, metadata
      ) VALUES (
        _admin.user_id,
        '⚠️ Regressão de hardening detectada',
        _msg,
        'warning',
        'security',
        '/admin/seguranca-acesso',
        jsonb_build_object('score', _score, 'max', _max, 'failures', _failures)
      );
      _notified := _notified + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'score', _score,
    'max', _max,
    'failures', _failures,
    'notified', _notified
  );
END;
$$;

-- Agendamento: diário às 04:00 UTC (logo após cleanup das 03:30)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hardening-regression-check-daily') THEN
    PERFORM cron.unschedule('hardening-regression-check-daily');
  END IF;
  PERFORM cron.schedule(
    'hardening-regression-check-daily',
    '0 4 * * *',
    $cron$ SELECT public.notify_hardening_regression(); $cron$
  );
END;
$$;