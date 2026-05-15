-- Seed function for E2E discount approval tests
-- Creates two fixed test users (seller-test, admin-test) and cleans up test data

CREATE OR REPLACE FUNCTION public.seed_discount_test_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
BEGIN
  -- Find existing test users by email in profiles
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  -- If users don't exist, return error (auth.users insertion requires Supabase Admin API, not SQL)
  IF _seller_id IS NULL OR _admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Test users not found. Create them via Supabase Admin API first.',
      'seller_exists', _seller_id IS NOT NULL,
      'admin_exists', _admin_id IS NOT NULL
    );
  END IF;

  -- Ensure roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_seller_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Sync role on profiles
  UPDATE public.profiles SET role = 'vendedor' WHERE user_id = _seller_id;
  UPDATE public.profiles SET role = 'admin' WHERE user_id = _admin_id;

  RETURN jsonb_build_object(
    'ok', true,
    'seller_id', _seller_id,
    'admin_id', _admin_id
  );
END;
$$;

-- Cleanup function for test data only (orphan-safe, scoped to test users)
CREATE OR REPLACE FUNCTION public.cleanup_discount_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
  _quotes_deleted int := 0;
  _requests_deleted int := 0;
  _notifs_deleted int := 0;
BEGIN
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  IF _seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'note', 'no test seller found, nothing to clean');
  END IF;

  -- Delete approval requests for seller-test quotes
  WITH deleted AS (
    DELETE FROM public.discount_approval_requests
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _requests_deleted FROM deleted;

  -- Delete quotes from test seller
  WITH deleted AS (
    DELETE FROM public.quotes
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _quotes_deleted FROM deleted;

  -- Delete test notifications
  WITH deleted AS (
    DELETE FROM public.workspace_notifications
    WHERE user_id IN (_seller_id, _admin_id)
      AND category IN ('discount', 'quotes')
    RETURNING 1
  ) SELECT count(*) INTO _notifs_deleted FROM deleted;

  RETURN jsonb_build_object(
    'ok', true,
    'requests_deleted', _requests_deleted,
    'quotes_deleted', _quotes_deleted,
    'notifications_deleted', _notifs_deleted
  );
END;
$$;

-- Restrict function execution
REVOKE ALL ON FUNCTION public.seed_discount_test_users() FROM public;
REVOKE ALL ON FUNCTION public.cleanup_discount_test_data() FROM public;
GRANT EXECUTE ON FUNCTION public.seed_discount_test_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_discount_test_data() TO authenticated;