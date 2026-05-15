-- ============================================================================
-- Auditoria de RLS — tabelas técnicas
-- ============================================================================
-- Objetivo: garantir que TODAS as políticas das tabelas marcadas como
-- "técnicas" (telemetria, segurança, logs, hub de conexões, MCP) usem
-- `is_dev(auth.uid())` e NÃO escalem privilégio via:
--   - alias `is_admin(auth.uid())` (admin legado / supervisor)
--   - helper `is_supervisor_or_above(auth.uid())`
--   - role check direto: `role = 'admin'` / `'supervisor'`
--   - cláusulas permissivas: `USING (true)` / `WITH CHECK (true)` sem outro gate
--
-- Como rodar:
--   psql "$SUPABASE_DB_URL" -f scripts/audit-technical-rls.sql
--   # ou colar o REPORT 4 (resumo) no Supabase SQL editor / read_query
--
-- O script roda 4 relatórios independentes:
--   1. Tabelas técnicas SEM RLS habilitada                  (deve estar vazio)
--   2. Detalhe completo de TODAS as policies das tabelas    (evidência)
--   3. Policies que vazam: usam is_admin sem gate is_dev    (deve estar vazio)
--   4. Resumo agregado por tabela com lista de leaks        (visão executiva)
--
-- IMPORTANTE: este script é READ-ONLY. Não altera nada.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- CTEs reutilizadas: SSOT de tabelas técnicas + extração de policies
-- ──────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

-- Não dá pra reusar CTE entre statements no psql sem temp view; criamos uma
-- temp view local, que cai no encerramento da sessão.
CREATE OR REPLACE TEMP VIEW _technical_tables(table_name, domain) AS
VALUES
  ('query_telemetry',          'telemetria'),
  ('optimization_queue',       'telemetria'),
  ('bot_detection_log',        'seguranca'),
  ('ip_access_control',        'seguranca'),
  ('request_rate_limits',      'seguranca'),
  ('login_attempts',           'seguranca'),
  ('admin_audit_log',          'seguranca'),
  ('mcp_api_keys',             'mcp'),
  ('integration_credentials',  'conexoes'),
  ('secret_rotation_log',      'conexoes'),
  ('external_connections',     'conexoes'),
  ('outbound_webhooks',        'conexoes'),
  ('inbound_webhook_endpoints','conexoes'),
  ('webhook_deliveries',       'conexoes'),
  ('inbound_webhook_events',   'conexoes');

CREATE OR REPLACE TEMP VIEW _all_policies AS
SELECT
  n.nspname            AS schema_name,
  c.relname            AS table_name,
  pol.polname          AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END                  AS cmd,
  pg_get_expr(pol.polqual,      pol.polrelid) AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
FROM pg_policy pol
JOIN pg_class    c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

CREATE OR REPLACE TEMP VIEW _classified AS
SELECT
  t.domain,
  t.table_name,
  p.policy_name,
  p.cmd,
  p.using_expr,
  p.check_expr,
  lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) AS combined,
  (lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) LIKE '%is_dev(%')                  AS uses_is_dev,
  (lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) LIKE '%is_admin(%')                AS uses_is_admin,
  (lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) LIKE '%is_supervisor_or_above(%')  AS uses_supervisor_helper,
  (lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) LIKE '%''admin''%'
   OR lower(COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '')) LIKE '%''supervisor''%')        AS mentions_admin_string,
  (TRIM(COALESCE(p.using_expr, '')) = 'true'
   OR TRIM(COALESCE(p.check_expr, '')) = 'true')                                                              AS has_permissive_true
FROM _technical_tables t
JOIN _all_policies p ON p.table_name = t.table_name;

-- ──────────────────────────────────────────────────────────────────────────
-- REPORT 1 — Tabelas técnicas SEM RLS habilitada
-- ──────────────────────────────────────────────────────────────────────────
\echo '== REPORT 1: Tabelas técnicas SEM RLS habilitada =='
SELECT
  t.domain,
  t.table_name,
  CASE
    WHEN c.relname IS NULL THEN 'TABLE_NOT_FOUND'
    WHEN c.relrowsecurity THEN 'rls_enabled'
    ELSE 'RLS_DISABLED'
  END AS status
FROM _technical_tables t
LEFT JOIN pg_class     c ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IS NULL OR NOT c.relrowsecurity
ORDER BY t.domain, t.table_name;

-- ──────────────────────────────────────────────────────────────────────────
-- REPORT 2 — Detalhe completo de cada policy classificada
-- ──────────────────────────────────────────────────────────────────────────
\echo ''
\echo '== REPORT 2: Detalhe de TODAS as policies das tabelas técnicas =='
SELECT
  domain,
  table_name,
  cmd,
  policy_name,
  uses_is_dev,
  uses_is_admin,
  uses_supervisor_helper,
  mentions_admin_string,
  has_permissive_true,
  COALESCE(using_expr, '(null)') AS using_expr,
  COALESCE(check_expr, '(null)') AS check_expr
FROM _classified
ORDER BY domain, table_name, cmd, policy_name;

-- ──────────────────────────────────────────────────────────────────────────
-- REPORT 3 — VAZAMENTOS: policies que dão acesso por is_admin sem is_dev
-- ──────────────────────────────────────────────────────────────────────────
\echo ''
\echo '== REPORT 3: LEAKS — policies admin-only (sem gate is_dev) =='
SELECT
  domain,
  table_name,
  cmd,
  policy_name,
  COALESCE(using_expr, '(null)') AS using_expr,
  COALESCE(check_expr, '(null)') AS check_expr,
  CASE
    WHEN uses_is_admin AND NOT uses_is_dev THEN 'is_admin_without_dev_gate'
    WHEN uses_supervisor_helper           THEN 'supervisor_helper_used'
    WHEN mentions_admin_string             THEN 'role_string_check'
    WHEN has_permissive_true               THEN 'permissive_true'
    ELSE 'unknown'
  END AS leak_kind
FROM _classified
WHERE
  (uses_is_admin AND NOT uses_is_dev)
  OR uses_supervisor_helper
  OR mentions_admin_string
  OR (has_permissive_true AND NOT uses_is_dev)
ORDER BY domain, table_name, cmd;

-- ──────────────────────────────────────────────────────────────────────────
-- REPORT 4 — Resumo executivo por tabela
-- ──────────────────────────────────────────────────────────────────────────
\echo ''
\echo '== REPORT 4: Resumo agregado por tabela =='
SELECT
  domain,
  table_name,
  COUNT(*) AS total_policies,
  SUM(CASE WHEN uses_is_dev                        THEN 1 ELSE 0 END) AS uses_dev,
  SUM(CASE WHEN uses_is_admin AND NOT uses_is_dev  THEN 1 ELSE 0 END) AS leaks_admin_no_dev,
  SUM(CASE WHEN uses_supervisor_helper             THEN 1 ELSE 0 END) AS uses_supervisor_helper,
  STRING_AGG(
    CASE WHEN uses_is_admin AND NOT uses_is_dev
         THEN cmd || ':' || policy_name
         ELSE NULL
    END,
    ' | '
  ) AS leak_policies
FROM _classified
GROUP BY domain, table_name
ORDER BY
  -- ordena tabelas com leaks primeiro
  (SUM(CASE WHEN uses_is_admin AND NOT uses_is_dev THEN 1 ELSE 0 END) > 0) DESC,
  domain, table_name;

-- Cleanup
DROP VIEW IF EXISTS _classified;
DROP VIEW IF EXISTS _all_policies;
DROP VIEW IF EXISTS _technical_tables;
