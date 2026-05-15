-- ═══════════════════════════════════════════════════════════════════
-- VALIDATE — D.2.1 Security & Audit Logs
-- ═══════════════════════════════════════════════════════════════════
-- Rodar APÓS patch.sql para validar aplicação correta.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Verificar criação das 7 tabelas
SELECT
  'tables_created' AS check_type,
  count(*) || '/7' AS result,
  CASE WHEN count(*) = 7 THEN '✅' ELSE '❌' END AS status,
  array_agg(table_name ORDER BY table_name) AS detail
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (
  'access_security_settings','audit_logs','auth_login_attempts',
  'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
);

-- 2. Verificar RLS habilitado nas 7
SELECT
  'rls_enabled' AS check_type,
  count(*) || '/7' AS result,
  CASE WHEN count(*) = 7 THEN '✅' ELSE '❌' END AS status,
  array_agg(c.relname ORDER BY c.relname) FILTER (WHERE c.relrowsecurity) AS with_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN (
  'access_security_settings','audit_logs','auth_login_attempts',
  'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
) AND c.relrowsecurity = true;

-- 3. Verificar 4 RPCs criadas
SELECT
  'rpcs_created' AS check_type,
  count(*) || '/4' AS result,
  CASE WHEN count(*) = 4 THEN '✅' ELSE '❌' END AS status,
  array_agg(DISTINCT p.proname ORDER BY p.proname) AS functions
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'log_access_denied','log_rls_denial','log_user_logout','check_hardening_status'
);

-- 4. Verificar enum step_up_action
SELECT
  'enum_created' AS check_type,
  CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname='step_up_action') THEN '✅' ELSE '❌' END AS status,
  COALESCE(
    (SELECT array_agg(enumlabel) FROM pg_enum WHERE enumtypid=(SELECT oid FROM pg_type WHERE typname='step_up_action')),
    ARRAY[]::text[]
  ) AS values;

-- 5. Verificar 7 colunas adicionadas em admin_audit_log
SELECT
  'admin_audit_log_alters' AS check_type,
  count(*) || '/7' AS result,
  CASE WHEN count(*) = 7 THEN '✅' ELSE '❌' END AS status,
  array_agg(column_name ORDER BY column_name) AS columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name='admin_audit_log'
  AND column_name IN ('status','source','started_at','finished_at','duration_ms','request_id','payload_summary');

-- 6. Verificar policies (esperado: 12)
SELECT
  'policies_created' AS check_type,
  count(*) || '/12' AS result,
  CASE WHEN count(*) >= 12 THEN '✅' ELSE '⚠️' END AS status
FROM pg_policies
WHERE schemaname='public' AND tablename IN (
  'access_security_settings','audit_logs','auth_login_attempts',
  'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
);

-- 7. Verificar indexes
SELECT
  'indexes_created' AS check_type,
  count(*) AS result,
  CASE WHEN count(*) >= 12 THEN '✅' ELSE '⚠️' END AS status
FROM pg_indexes
WHERE schemaname='public' AND tablename IN (
  'access_security_settings','audit_logs','auth_login_attempts',
  'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
);
