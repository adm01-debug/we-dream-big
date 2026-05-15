-- Drop 3 duplicate tables that have been migrated to external DB (SSOT)
-- All tables confirmed with 0 records in local DB

-- 1. product_personalization_areas → migrated to print_area_techniques (external)
DROP TABLE IF EXISTS public.product_personalization_areas CASCADE;

-- 2. product_supplier_sources → migrated to variant_supplier_sources (external)
DROP TABLE IF EXISTS public.product_supplier_sources CASCADE;

-- 3. product_price_history → migrated to price_history (external)
DROP TABLE IF EXISTS public.product_price_history CASCADE;