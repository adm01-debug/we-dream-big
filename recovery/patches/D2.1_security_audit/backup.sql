-- ═══════════════════════════════════════════════════════════════════
-- BACKUP — D.2.1 Security & Audit Logs
-- ═══════════════════════════════════════════════════════════════════
-- Pré-requisito: rodar ANTES do patch.sql
-- Cria backup do estado do destino antes de aplicar D.2.1.
--
-- O patch adiciona:
--   - 7 tables (access_security_settings, audit_logs, auth_login_attempts,
--     geo_allowed_countries, hardening_health_snapshots, rls_denial_log,
--     step_up_audit_log)
--   - 4 RPCs (log_access_denied, log_rls_denial, log_user_logout,
--     check_hardening_status)
--   - 1 enum (step_up_action)
--   - 7 colunas em admin_audit_log (status, source, started_at,
--     finished_at, duration_ms, request_id, payload_summary)
--
-- Como NENHUMA das 7 tabelas existia previamente, o backup principal é
-- do estado anterior de admin_audit_log (que ganha 7 colunas).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Backup de admin_audit_log antes do ALTER (snapshot completo)
CREATE TABLE IF NOT EXISTS public._backup_admin_audit_log_pre_d21 AS
SELECT * FROM public.admin_audit_log;

-- Snapshot da estrutura (em caso de necessidade futura)
COMMENT ON TABLE public._backup_admin_audit_log_pre_d21 IS
  'Backup pré D.2.1 — admin_audit_log antes de adicionar 7 colunas. Criado em 2026-05-11.';

-- Verificação: confirmar enum step_up_action NÃO existia antes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'step_up_action') THEN
    RAISE WARNING 'Enum step_up_action já existe — verifique antes de aplicar patch';
  END IF;
END$$;

COMMIT;

-- Validação: backup criado?
SELECT
  'admin_audit_log_backup' AS object,
  count(*) AS rows_backed_up
FROM public._backup_admin_audit_log_pre_d21;
