-- ============================================================================
-- Infra de migração de papéis em lotes
-- ============================================================================

-- Status de lote / item
DO $$ BEGIN
  CREATE TYPE public.role_migration_status AS ENUM
    ('pending','running','completed','failed','partial','dry_run');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.role_migration_item_status AS ENUM
    ('pending','success','failed','skipped','dry_run');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- Lote
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_migration_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,
  reason          text NOT NULL,
  initiated_by    uuid NOT NULL,
  dry_run         boolean NOT NULL DEFAULT false,
  status          public.role_migration_status NOT NULL DEFAULT 'pending',
  total_items     integer NOT NULL DEFAULT 0,
  success_count   integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  skipped_count   integer NOT NULL DEFAULT 0,
  started_at      timestamptz,
  finished_at     timestamptz,
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_mig_batches_initiated_by
  ON public.role_migration_batches(initiated_by);
CREATE INDEX IF NOT EXISTS idx_role_mig_batches_created_at
  ON public.role_migration_batches(created_at DESC);

ALTER TABLE public.role_migration_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors+ can read role_migration_batches" ON public.role_migration_batches;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_batches' AND policyname = 'Supervisors+ can read role_migration_batches') THEN
    CREATE POLICY "Supervisors+ can read role_migration_batches"
      ON public.role_migration_batches FOR SELECT TO authenticated
      USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- Escritas só via SECURITY DEFINER. RLS bloqueia DML direto via JWT.
DROP POLICY IF EXISTS "No direct insert role_migration_batches" ON public.role_migration_batches;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_batches' AND policyname = 'No direct insert role_migration_batches') THEN
    CREATE POLICY "No direct insert role_migration_batches"
      ON public.role_migration_batches FOR INSERT TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

DROP POLICY IF EXISTS "No direct update role_migration_batches" ON public.role_migration_batches;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_batches' AND policyname = 'No direct update role_migration_batches') THEN
    CREATE POLICY "No direct update role_migration_batches"
      ON public.role_migration_batches FOR UPDATE TO authenticated
      USING (false) WITH CHECK (false);
  END IF;
END $$;

DROP POLICY IF EXISTS "No direct delete role_migration_batches" ON public.role_migration_batches;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_batches' AND policyname = 'No direct delete role_migration_batches') THEN
    CREATE POLICY "No direct delete role_migration_batches"
      ON public.role_migration_batches FOR DELETE TO authenticated
      USING (false);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Item por usuário
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_migration_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      uuid NOT NULL REFERENCES public.role_migration_batches(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  user_email    text,
  from_role     public.app_role,
  to_role       public.app_role NOT NULL,
  operation     text NOT NULL CHECK (operation IN ('add','remove','replace')),
  status        public.role_migration_item_status NOT NULL DEFAULT 'pending',
  error_message text,
  duration_ms   integer,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_mig_items_batch ON public.role_migration_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_role_mig_items_user  ON public.role_migration_items(user_id);
CREATE INDEX IF NOT EXISTS idx_role_mig_items_status ON public.role_migration_items(status);

ALTER TABLE public.role_migration_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors+ can read role_migration_items" ON public.role_migration_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_items' AND policyname = 'Supervisors+ can read role_migration_items') THEN
    CREATE POLICY "Supervisors+ can read role_migration_items"
      ON public.role_migration_items FOR SELECT TO authenticated
      USING (public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "No direct insert role_migration_items" ON public.role_migration_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_items' AND policyname = 'No direct insert role_migration_items') THEN
    CREATE POLICY "No direct insert role_migration_items"
      ON public.role_migration_items FOR INSERT TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

DROP POLICY IF EXISTS "No direct update role_migration_items" ON public.role_migration_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_items' AND policyname = 'No direct update role_migration_items') THEN
    CREATE POLICY "No direct update role_migration_items"
      ON public.role_migration_items FOR UPDATE TO authenticated
      USING (false) WITH CHECK (false);
  END IF;
END $$;

DROP POLICY IF EXISTS "No direct delete role_migration_items" ON public.role_migration_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_migration_items' AND policyname = 'No direct delete role_migration_items') THEN
    CREATE POLICY "No direct delete role_migration_items"
      ON public.role_migration_items FOR DELETE TO authenticated
      USING (false);
  END IF;
END $$;

-- ============================================================================
-- Função: execute_role_migration_batch
-- ============================================================================
-- Recebe um JSON array de operações:
--   [{ "user_id": "...", "to_role": "supervisor", "operation": "add" }, ...]
-- operation:
--   'add'     → INSERT user_roles (user_id, to_role) ON CONFLICT DO NOTHING
--   'remove'  → DELETE user_roles WHERE user_id=... AND role=to_role
--   'replace' → DELETE todos os papéis do user, INSERT (user_id, to_role)
--
-- Retorna o batch_id. Cada item roda em EXCEPTION block isolado: falha
-- individual marca o item como 'failed' mas NÃO derruba o lote.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_role_migration_batch(
  _label    text,
  _reason   text,
  _items    jsonb,
  _dry_run  boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _batch_id      uuid;
  _caller        uuid := auth.uid();
  _started       timestamptz := clock_timestamp();
  _item          jsonb;
  _item_id       uuid;
  _user_id       uuid;
  _to_role       public.app_role;
  _from_role     public.app_role;
  _operation     text;
  _email         text;
  _item_started  timestamptz;
  _item_status   public.role_migration_item_status;
  _err           text;
  _success       int := 0;
  _failed        int := 0;
  _skipped       int := 0;
  _total         int := 0;
BEGIN
  -- Autorização: somente admin estrito.
  IF NOT public.is_admin_strict(_caller) THEN
    RAISE EXCEPTION 'forbidden: only admin can execute role migration batches'
      USING ERRCODE = '42501';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'invalid items: expected non-empty jsonb array' USING ERRCODE = '22023';
  END IF;

  IF _label IS NULL OR length(trim(_label)) = 0 THEN
    RAISE EXCEPTION 'label is required' USING ERRCODE = '22023';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'reason is required (min 5 chars)' USING ERRCODE = '22023';
  END IF;

  _total := jsonb_array_length(_items);

  -- Cria batch
  INSERT INTO public.role_migration_batches
    (label, reason, initiated_by, dry_run, status, total_items, started_at)
  VALUES
    (trim(_label), trim(_reason), _caller, _dry_run,
     CASE WHEN _dry_run THEN 'dry_run' ELSE 'running' END::public.role_migration_status,
     _total, _started)
  RETURNING id INTO _batch_id;

  -- Auditoria global do disparo
  INSERT INTO public.admin_audit_log
    (user_id, action, resource_type, resource_id, details, started_at, status, source)
  VALUES
    (_caller, 'role_migration.batch_started', 'role_migration_batch', _batch_id::text,
     jsonb_build_object('label', _label, 'total', _total, 'dry_run', _dry_run, 'reason', _reason),
     _started, 'success', 'rpc:execute_role_migration_batch');

  -- Processa cada item
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _item_started := clock_timestamp();
    _item_status := 'pending';
    _err := NULL;
    _from_role := NULL;

    BEGIN
      _user_id   := (_item->>'user_id')::uuid;
      _to_role   := (_item->>'to_role')::public.app_role;
      _operation := COALESCE(_item->>'operation', 'add');

      IF _operation NOT IN ('add','remove','replace') THEN
        RAISE EXCEPTION 'invalid operation: %', _operation;
      END IF;

      SELECT email INTO _email FROM public.profiles WHERE user_id = _user_id;
      SELECT role  INTO _from_role
        FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

      -- Cria item placeholder
      INSERT INTO public.role_migration_items
        (batch_id, user_id, user_email, from_role, to_role, operation, status, processed_at)
      VALUES
        (_batch_id, _user_id, _email, _from_role, _to_role, _operation,
         CASE WHEN _dry_run THEN 'dry_run' ELSE 'pending' END::public.role_migration_item_status,
         _item_started)
      RETURNING id INTO _item_id;

      IF _dry_run THEN
        _item_status := 'dry_run';
        _skipped := _skipped + 1;
      ELSE
        IF _operation = 'add' THEN
          INSERT INTO public.user_roles (user_id, role)
          VALUES (_user_id, _to_role)
          ON CONFLICT (user_id, role) DO NOTHING;
        ELSIF _operation = 'remove' THEN
          DELETE FROM public.user_roles
            WHERE user_id = _user_id AND role = _to_role;
        ELSIF _operation = 'replace' THEN
          DELETE FROM public.user_roles WHERE user_id = _user_id;
          INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _to_role);
        END IF;
        _item_status := 'success';
        _success := _success + 1;
      END IF;

      UPDATE public.role_migration_items
         SET status = _item_status,
             duration_ms = (EXTRACT(EPOCH FROM (clock_timestamp() - _item_started)) * 1000)::int
       WHERE id = _item_id;

      INSERT INTO public.admin_audit_log
        (user_id, action, resource_type, resource_id, details, started_at, finished_at, status, source)
      VALUES
        (_caller,
         CASE WHEN _dry_run THEN 'role_migration.item_dry_run' ELSE 'role_migration.item_applied' END,
         'user_role', _user_id::text,
         jsonb_build_object(
           'batch_id', _batch_id, 'item_id', _item_id,
           'from_role', _from_role, 'to_role', _to_role,
           'operation', _operation, 'user_email', _email),
         _item_started, clock_timestamp(),
         CASE WHEN _dry_run THEN 'dry_run' ELSE 'success' END,
         'rpc:execute_role_migration_batch');

    EXCEPTION WHEN OTHERS THEN
      _err := SQLERRM;
      _failed := _failed + 1;
      -- Se o INSERT do item falhou antes, garantimos um registro
      IF _item_id IS NULL THEN
        INSERT INTO public.role_migration_items
          (batch_id, user_id, user_email, from_role, to_role, operation,
           status, error_message, processed_at,
           duration_ms)
        VALUES
          (_batch_id, COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
           _email, _from_role, _to_role, COALESCE(_operation,'add'),
           'failed', _err, _item_started,
           (EXTRACT(EPOCH FROM (clock_timestamp() - _item_started)) * 1000)::int);
      ELSE
        UPDATE public.role_migration_items
           SET status = 'failed',
               error_message = _err,
               duration_ms = (EXTRACT(EPOCH FROM (clock_timestamp() - _item_started)) * 1000)::int
         WHERE id = _item_id;
      END IF;

      INSERT INTO public.admin_audit_log
        (user_id, action, resource_type, resource_id, details, started_at, finished_at, status, source)
      VALUES
        (_caller, 'role_migration.item_failed', 'user_role',
         COALESCE(_user_id::text, '<unknown>'),
         jsonb_build_object('batch_id', _batch_id, 'item_id', _item_id,
                            'to_role', _to_role, 'operation', _operation,
                            'error', _err),
         _item_started, clock_timestamp(), 'failed',
         'rpc:execute_role_migration_batch');
    END;

    _item_id := NULL; -- reset entre iterações
  END LOOP;

  -- Fecha o batch
  UPDATE public.role_migration_batches
     SET status = CASE
                    WHEN _dry_run THEN 'dry_run'
                    WHEN _failed = 0 THEN 'completed'
                    WHEN _success = 0 THEN 'failed'
                    ELSE 'partial'
                  END::public.role_migration_status,
         success_count = _success,
         failed_count  = _failed,
         skipped_count = _skipped,
         finished_at   = clock_timestamp(),
         duration_ms   = (EXTRACT(EPOCH FROM (clock_timestamp() - _started)) * 1000)::int
   WHERE id = _batch_id;

  INSERT INTO public.admin_audit_log
    (user_id, action, resource_type, resource_id, details, started_at, finished_at, status, source)
  VALUES
    (_caller, 'role_migration.batch_finished', 'role_migration_batch', _batch_id::text,
     jsonb_build_object('total', _total, 'success', _success,
                        'failed', _failed, 'skipped', _skipped, 'dry_run', _dry_run),
     _started, clock_timestamp(),
     CASE WHEN _failed = 0 THEN 'success'
          WHEN _success = 0 THEN 'failed'
          ELSE 'partial' END,
     'rpc:execute_role_migration_batch');

  RETURN _batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) IS
  'Executa migracao de papeis em lote com auditoria por usuario. Apenas admin estrito. Use _dry_run=true para validar sem aplicar.';
