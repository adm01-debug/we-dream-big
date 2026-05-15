-- ============================================================
--  T15 — Fix `auth_users_exposed` advisor em v_system_health_dashboard
--  (redeploy 2026-05 Fase 1 - bloqueador B3)
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- Esta migration foi aplicada direto no banco prod via MCP `apply_migration`
-- mas a entrada em `supabase_migrations.schema_migrations` ficou com SQL
-- válido (não summary), então este arquivo é cópia fiel.
--
-- Contexto: o advisor `auth_users_exposed` apontava que a view
-- `public.v_system_health_dashboard` expunha colunas vindas de `auth.users`
-- para qualquer cliente PostgREST (anon/authenticated). Solução:
--  1) `security_invoker = true` — view roda com permissões de quem chama,
--     não do dono, então RLS de `auth.users` se aplica.
--  2) REVOKE de leitura para anon/authenticated — só service_role consulta.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_system_health_dashboard'
  ) THEN
    ALTER VIEW public.v_system_health_dashboard SET (security_invoker = true);
    REVOKE ALL ON public.v_system_health_dashboard FROM anon;
    REVOKE ALL ON public.v_system_health_dashboard FROM authenticated;
  END IF;
END $$;
