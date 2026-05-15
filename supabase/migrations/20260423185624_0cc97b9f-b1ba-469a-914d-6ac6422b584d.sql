-- Generic key/value settings table for system-wide tunables (admin-managed).
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Add missing columns to system_settings if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='key') THEN
    ALTER TABLE public.system_settings ADD COLUMN key TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='value') THEN
    ALTER TABLE public.system_settings ADD COLUMN value JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='updated_by') THEN
    ALTER TABLE public.system_settings ADD COLUMN updated_by UUID;
  END IF;
  -- Legacy table has setting_key/setting_value as NOT NULL; relax them so inserts
  -- using the new key/value column names do not fail the NOT NULL constraint.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='setting_key' AND is_nullable='NO') THEN
    ALTER TABLE public.system_settings ALTER COLUMN setting_key DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='setting_value' AND is_nullable='NO') THEN
    ALTER TABLE public.system_settings ALTER COLUMN setting_value DROP NOT NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "system_settings readable by authenticated" ON public.system_settings;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings readable by authenticated') THEN
    CREATE POLICY "system_settings readable by authenticated"
      ON public.system_settings FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- No direct INSERT/UPDATE/DELETE policy: changes go through SECURITY DEFINER RPCs.

-- Default value (30 minutes of continuous failure before notifying)
INSERT INTO public.system_settings (key, value)
VALUES ('connection_failure_window_minutes', to_jsonb(30))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_connection_failure_window_minutes()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value)::text::int FROM public.system_settings
     WHERE key = 'connection_failure_window_minutes'),
    30
  );
$$;

CREATE OR REPLACE FUNCTION public.set_connection_failure_window_minutes(minutes integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF minutes NOT IN (0, 15, 30, 60, 120, 240) THEN
    RAISE EXCEPTION 'invalid window: must be one of 0, 15, 30, 60, 120, 240 minutes';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_by, updated_at)
  VALUES ('connection_failure_window_minutes', to_jsonb(minutes), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    'connection_failure_window_changed',
    'system_setting',
    'connection_failure_window_minutes',
    jsonb_build_object('minutes', minutes)
  );

  RETURN minutes;
END;
$$;

REVOKE ALL ON FUNCTION public.set_connection_failure_window_minutes(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_connection_failure_window_minutes(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_failure_window_minutes() TO authenticated;