-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK — D.2.1 Security & Audit Logs
-- ═══════════════════════════════════════════════════════════════════
-- Desfaz integralmente o que o patch.sql aplicou.
-- ATENÇÃO: vai perder QUALQUER dado escrito após o patch nas 7 tabelas.
-- Use apenas se a aplicação precisar ser revertida.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop 4 RPCs criadas pelo patch
DROP FUNCTION IF EXISTS public.log_access_denied(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_rls_denial(text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_user_logout(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.check_hardening_status() CASCADE;

-- 2. Drop 7 tabelas criadas pelo patch (CASCADE para FKs e policies)
DROP TABLE IF EXISTS public.access_security_settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.auth_login_attempts CASCADE;
DROP TABLE IF EXISTS public.geo_allowed_countries CASCADE;
DROP TABLE IF EXISTS public.hardening_health_snapshots CASCADE;
DROP TABLE IF EXISTS public.rls_denial_log CASCADE;
DROP TABLE IF EXISTS public.step_up_audit_log CASCADE;

-- 3. Reverter ALTER TABLE em admin_audit_log (remove 7 colunas adicionadas)
ALTER TABLE public.admin_audit_log
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS finished_at,
  DROP COLUMN IF EXISTS duration_ms,
  DROP COLUMN IF EXISTS request_id,
  DROP COLUMN IF EXISTS payload_summary;

-- 4. Drop enum step_up_action
DROP TYPE IF EXISTS public.step_up_action CASCADE;

-- 5. Restaurar admin_audit_log a partir do backup (opcional, só se dados foram escritos)
-- DESCOMENTE se precisar restaurar:
-- TRUNCATE public.admin_audit_log;
-- INSERT INTO public.admin_audit_log SELECT * FROM public._backup_admin_audit_log_pre_d21;

-- 6. Manter o backup (não deletar — segurança extra)
COMMENT ON TABLE public._backup_admin_audit_log_pre_d21 IS
  'Backup pré D.2.1 — preservado após rollback. Deletar manualmente quando seguro.';

COMMIT;

-- Validação
SELECT
  'D.2.1 rollback complete' AS status,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN (
     'access_security_settings','audit_logs','auth_login_attempts',
     'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
   )) AS remaining_tables,
  CASE
    WHEN (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN (
            'access_security_settings','audit_logs','auth_login_attempts',
            'geo_allowed_countries','hardening_health_snapshots','rls_denial_log','step_up_audit_log'
          )) = 0 THEN '✅ Todas as tables removidas'
    ELSE '❌ Rollback parcial'
  END AS verdict;
