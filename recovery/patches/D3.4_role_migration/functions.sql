-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.3.4_role_migration_extra - RPCs follow-up post merge
-- 1 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: execute_role_migration_batch(text, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_role_migration_batch(_label text, _reason text, _items jsonb, _dry_run boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

COMMIT;
