-- ═════════════════════════════════════════════════════════════════
-- BACKUP — D.1.1 (Storage Buckets + Policies)
-- Rodar ANTES do patch.sql. Captura estado atual.
-- ═════════════════════════════════════════════════════════════════

-- 1. Snapshot dos buckets existentes
CREATE TABLE IF NOT EXISTS public._backup_storage_buckets_20260511_d11 AS
SELECT *, now() AS backup_ts FROM storage.buckets;

-- 2. Snapshot das policies existentes em storage.*
CREATE TABLE IF NOT EXISTS public._backup_storage_policies_20260511_d11 AS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, now() AS backup_ts
FROM pg_policies WHERE schemaname = 'storage';

-- 3. Confirmar
SELECT 
  (SELECT count(*) FROM public._backup_storage_buckets_20260511_d11) AS buckets_backed_up,
  (SELECT count(*) FROM public._backup_storage_policies_20260511_d11) AS policies_backed_up;
