-- =====================================================================
-- BLOCO 11 — Consultas de verificação e relatório de status (pg_cron)
-- =====================================================================
-- Use estas queries no SQL Editor (ou psql) para auditar cron jobs.
-- Read-only — seguro rodar em produção.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Q1 — Inventário de jobs agendados
-- ---------------------------------------------------------------------
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database,
  username,
  CASE
    WHEN length(command) > 80 THEN substring(command FROM 1 FOR 77) || '...'
    ELSE command
  END AS command_preview
FROM cron.job
ORDER BY active DESC, jobname;


-- ---------------------------------------------------------------------
-- Q2 — Últimas 20 execuções (todos os jobs)
-- ---------------------------------------------------------------------
SELECT
  d.jobid,
  j.jobname,
  d.status,
  d.start_time,
  round(extract(epoch FROM (d.end_time - d.start_time))::numeric, 2) AS duration_s,
  CASE
    WHEN length(d.return_message) > 80 THEN substring(d.return_message FROM 1 FOR 77) || '...'
    ELSE d.return_message
  END AS return_message
FROM cron.job_run_details d
LEFT JOIN cron.job j ON j.jobid = d.jobid
ORDER BY d.start_time DESC
LIMIT 20;


-- ---------------------------------------------------------------------
-- Q3 — Últimas falhas (24h)
-- ---------------------------------------------------------------------
SELECT
  d.jobid,
  j.jobname,
  d.status,
  d.start_time,
  d.return_message
FROM cron.job_run_details d
LEFT JOIN cron.job j ON j.jobid = d.jobid
WHERE d.status <> 'succeeded'
  AND d.start_time > now() - interval '24 hours'
ORDER BY d.start_time DESC;


-- ---------------------------------------------------------------------
-- Q4 — RELATÓRIO RÁPIDO DE STATUS (últimas 24h, agregado por job)
-- ---------------------------------------------------------------------
WITH stats AS (
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    count(d.runid)                                                AS runs_24h,
    count(*) FILTER (WHERE d.status = 'succeeded')                AS ok_24h,
    count(*) FILTER (WHERE d.status = 'failed')                   AS fail_24h,
    max(d.start_time)                                             AS last_run,
    max(d.start_time) FILTER (WHERE d.status = 'succeeded')       AS last_ok,
    max(d.start_time) FILTER (WHERE d.status = 'failed')          AS last_fail,
    round(avg(extract(epoch FROM (d.end_time - d.start_time)))::numeric, 2) AS avg_dur_s,
    round(max(extract(epoch FROM (d.end_time - d.start_time)))::numeric, 2) AS max_dur_s
  FROM cron.job j
  LEFT JOIN cron.job_run_details d
    ON d.jobid = j.jobid
   AND d.start_time > now() - interval '24 hours'
  GROUP BY j.jobid, j.jobname, j.schedule, j.active
)
SELECT
  jobname,
  schedule,
  active,
  runs_24h,
  ok_24h,
  fail_24h,
  CASE
    WHEN runs_24h = 0 THEN '—'
    ELSE round(100.0 * ok_24h / runs_24h, 1)::text || '%'
  END AS success_rate,
  avg_dur_s,
  max_dur_s,
  last_run,
  last_fail,
  CASE
    WHEN NOT active                                THEN '⏸️  pausado'
    WHEN last_run IS NULL                          THEN '⚠️  nunca rodou (24h)'
    WHEN fail_24h > 0 AND last_fail > last_ok     THEN '❌ última execução falhou'
    WHEN fail_24h > 0                              THEN '⚠️  com falhas (mas última OK)'
    WHEN ok_24h > 0                                THEN '✅ saudável'
    ELSE '❓ status indefinido'
  END AS health
FROM stats
ORDER BY active DESC, jobname;


-- ---------------------------------------------------------------------
-- Q5 — Jobs HTTP: últimas respostas pg_net (debug de net.http_post)
-- ---------------------------------------------------------------------
-- Útil quando o cron diz `succeeded` mas a edge function devolveu 4xx/5xx.
SELECT
  id,
  status_code,
  CASE
    WHEN status_code BETWEEN 200 AND 299 THEN '✅'
    WHEN status_code BETWEEN 400 AND 499 THEN '⚠️ 4xx'
    WHEN status_code >= 500              THEN '❌ 5xx'
    ELSE '·'
  END AS flag,
  created,
  CASE
    WHEN length(content) > 120 THEN substring(content FROM 1 FOR 117) || '...'
    ELSE content
  END AS content_preview,
  error_msg
FROM net._http_response
ORDER BY created DESC
LIMIT 20;


-- ---------------------------------------------------------------------
-- Q6 — Pré-flight do ambiente (extensions + vault secrets esperados)
-- ---------------------------------------------------------------------
SELECT
  'pg_cron'                AS check_name,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')  AS ok
UNION ALL SELECT
  'pg_net',
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
UNION ALL SELECT
  'vault.edge_anon_key',
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edge_anon_key')
UNION ALL SELECT
  'vault.edge_url_webhook_alerts',
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edge_url_webhook_alerts')
UNION ALL SELECT
  'vault.edge_url_price_watcher',
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edge_url_price_watcher')
UNION ALL SELECT
  'helper public.cron_invoke_edge',
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'cron_invoke_edge');


-- =====================================================================
-- 💡 Dica: salve Q4 como uma view para monitoramento contínuo:
--     CREATE OR REPLACE VIEW public.cron_health_24h AS <Q4>;
--     Depois plote em /admin/telemetria ou consulte do dashboard.
-- =====================================================================
