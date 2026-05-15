
-- Helper de teste — só admin pode chamar
CREATE OR REPLACE FUNCTION public._rls_test_as(_uid uuid, _q text)
RETURNS TABLE(result text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_strict(auth.uid()) AND current_user <> 'postgres' AND current_user <> 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',_uid::text,'role','authenticated')::text, true);
  PERFORM set_config('role','authenticated', true);
  RETURN QUERY EXECUTE _q;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 'ERROR: '||SQLERRM;
END $$;
