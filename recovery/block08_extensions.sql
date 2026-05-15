-- =====================================================================
-- BLOCO 8 — EXTENSIONS
-- 7 extensions instaladas (excluindo plpgsql, que é built-in)
-- Todas em schemas dedicados (extensions / vault / pg_catalog)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"            WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"           WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"             WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net"              WITH SCHEMA extensions;

-- pg_cron e supabase_vault são instalados automaticamente pelo Supabase
-- nos schemas pg_catalog e vault, respectivamente.
CREATE EXTENSION IF NOT EXISTS "pg_cron"             WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "supabase_vault"      WITH SCHEMA vault;

-- Importante: funções SECURITY DEFINER do Bloco 4 usam pgcrypto/uuid-ossp.
-- Se não estiver em Supabase, ajustar search_path do banco:
--   ALTER DATABASE postgres SET search_path = public, extensions;
