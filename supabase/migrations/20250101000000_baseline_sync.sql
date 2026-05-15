-- Baseline sync placeholder (no-op).
-- Historical migration versions were inserted directly into production's
-- supabase_migrations.schema_migrations via MCP execute_sql (ON CONFLICT DO NOTHING).
-- The INSERT approach was incompatible with Supabase's migration runner which
-- pre-computes the pending list before any migration runs, causing duplicate
-- key violations. This file is kept as a no-op to satisfy the version check.
SELECT 1;
