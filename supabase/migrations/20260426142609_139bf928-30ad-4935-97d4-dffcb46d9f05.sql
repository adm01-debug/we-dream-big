CREATE OR REPLACE FUNCTION public.audit_rls_matrix()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role))
  THEN
    RAISE EXCEPTION 'audit_rls_matrix: acesso negado';
  END IF;

  WITH crit_tables AS (
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('seller_id','user_id','owner_id','created_by','assigned_to')
  ),
  rls AS (
    SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  ),
  ops AS (
    SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS op
  ),
  pol_per_op AS (
    -- Expande policies "ALL" para as 4 operações
    SELECT p.tablename, op.op AS cmd,
           p.policyname, p.qual, p.with_check, p.permissive, p.roles
    FROM pg_policies p
    CROSS JOIN ops op
    WHERE p.schemaname = 'public'
      AND (p.cmd = op.op OR p.cmd = 'ALL')
  ),
  agg AS (
    SELECT tablename, cmd,
      jsonb_agg(jsonb_build_object(
        'name', policyname,
        'qual', COALESCE(qual::text,''),
        'with_check', COALESCE(with_check::text,''),
        'permissive', permissive,
        'roles', roles
      ) ORDER BY policyname) AS policies,
      string_agg(DISTINCT COALESCE(qual::text,''), ' || ' ORDER BY COALESCE(qual::text,'')) AS quals_concat
    FROM pol_per_op
    GROUP BY tablename, cmd
  ),
  matrix AS (
    SELECT
      t.table_name,
      r.rls_enabled,
      o.op,
      a.policies,
      a.quals_concat,
      (a.policies IS NULL) AS missing
    FROM crit_tables t
    LEFT JOIN rls r ON r.table_name = t.table_name
    CROSS JOIN ops o
    LEFT JOIN agg a ON a.tablename = t.table_name AND a.cmd = o.op
  ),
  -- Detecta divergência: o predicado de SELECT é diferente do de UPDATE/DELETE
  divergence AS (
    SELECT m.table_name,
      max(m.quals_concat) FILTER (WHERE m.op = 'SELECT') AS sel_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'UPDATE') AS upd_q,
      max(m.quals_concat) FILTER (WHERE m.op = 'DELETE') AS del_q
    FROM matrix m
    GROUP BY m.table_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', m.table_name,
    'rls_enabled', COALESCE(m.rls_enabled,false),
    'operation', m.op,
    'missing', m.missing,
    'policy_count', COALESCE(jsonb_array_length(m.policies),0),
    'policies', COALESCE(m.policies,'[]'::jsonb),
    'criterion_diverges',
      CASE
        WHEN m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q THEN true
        WHEN m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q THEN true
        ELSE false
      END,
    'severity',
      CASE
        WHEN NOT COALESCE(m.rls_enabled,false) THEN 'critical'
        WHEN m.missing AND m.op = 'SELECT' THEN 'high'
        WHEN m.missing THEN 'medium'
        WHEN ((m.op = 'UPDATE' AND d.sel_q IS NOT NULL AND d.upd_q IS NOT NULL AND d.sel_q <> d.upd_q)
           OR (m.op = 'DELETE' AND d.sel_q IS NOT NULL AND d.del_q IS NOT NULL AND d.sel_q <> d.del_q)) THEN 'review'
        ELSE 'ok'
      END
  ) ORDER BY m.table_name,
       CASE m.op WHEN 'SELECT' THEN 1 WHEN 'INSERT' THEN 2 WHEN 'UPDATE' THEN 3 ELSE 4 END
  ), '[]'::jsonb)
  INTO v_result
  FROM matrix m
  LEFT JOIN divergence d ON d.table_name = m.table_name;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_rls_matrix() FROM public;
GRANT EXECUTE ON FUNCTION public.audit_rls_matrix() TO authenticated, service_role;