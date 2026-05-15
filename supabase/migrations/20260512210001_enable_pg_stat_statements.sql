-- Enable pg_stat_statements for slow-query monitoring (T24 Observability)
-- pg_stat_statements tracks execution statistics for all SQL statements.
-- Required for the observability dashboard slow-query panel.
--
-- Note: This extension must be enabled by a superuser. In Supabase, it is
-- available via the dashboard → Database → Extensions → pg_stat_statements.
-- This migration acts as documentation and idempotent activation.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View: slow queries (p95 > 100ms) — consumida pelo AppHealthDashboard
-- Exposta apenas para o role `service_role` (read-only, admin-only).
CREATE OR REPLACE VIEW public.slow_queries_view AS
SELECT
  pg_stat_statements.userid::regrole::text AS "user",
  pg_stat_statements.dbid,
  pg_stat_statements.queryid,
  left(pg_stat_statements.query, 200) AS query_snippet,
  pg_stat_statements.calls,
  round((pg_stat_statements.total_exec_time / pg_stat_statements.calls)::numeric, 2) AS avg_ms,
  round(pg_stat_statements.min_exec_time::numeric, 2) AS min_ms,
  round(pg_stat_statements.max_exec_time::numeric, 2) AS max_ms,
  round(pg_stat_statements.stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE pg_stat_statements.calls > 5
  AND (pg_stat_statements.total_exec_time / pg_stat_statements.calls) > 100
ORDER BY avg_ms DESC
LIMIT 50;

-- RLS: view is accessible only via service_role (no anon/authenticated access)
REVOKE ALL ON public.slow_queries_view FROM anon, authenticated;
GRANT SELECT ON public.slow_queries_view TO service_role;

COMMENT ON VIEW public.slow_queries_view IS
  'Queries lentas (avg > 100ms, calls > 5) via pg_stat_statements. Acessível apenas por service_role. Consumida pelo painel de observabilidade.';
