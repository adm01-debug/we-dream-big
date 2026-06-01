-- Migration: grant_rest_native_views
-- Date: 2026-06-01
-- Context: REST native migration (kill-switch OFF since 2026-05-30).
-- 7 views/MVs are in REST_NATIVE_SAFE_TABLES but return HTTP 401 via PostgREST
-- because the anon/authenticated roles lack SELECT privilege.
-- These were previously served through external-db-bridge (which ran as service_role).
-- Now that all queries go through PostgREST, explicit grants are required.

-- authenticated role (admin panel)
GRANT SELECT ON categories_tree_visual       TO authenticated;
GRANT SELECT ON mv_product_intelligence      TO authenticated;
GRANT SELECT ON mv_product_compositions      TO authenticated;
GRANT SELECT ON mv_product_cards             TO authenticated;
GRANT SELECT ON v_n8n_sync_summary           TO authenticated;
GRANT SELECT ON v_n8n_sync_errors            TO authenticated;
GRANT SELECT ON v_n8n_sync_success_recent    TO authenticated;
GRANT SELECT ON materials_complete           TO authenticated;
GRANT SELECT ON mv_material_group_stats      TO authenticated;

-- anon role (public catalog, unauth users)
-- categories_tree_visual: used by sidebar navigation (non-auth users see categories)
GRANT SELECT ON categories_tree_visual       TO anon;
-- mv_product_intelligence: used for product sorting badges in public catalog
GRANT SELECT ON mv_product_intelligence      TO anon;
