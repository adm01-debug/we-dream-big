-- Materialized view for popular products (last 30 days)
-- Guard: depende de product_views, que pode não existir em preview snapshots.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_views')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    RAISE NOTICE 'product_views/products ausente em preview — skipping product_popularity_30d MV';
    RETURN;
  END IF;

  EXECUTE $sql$
    CREATE MATERIALIZED VIEW IF NOT EXISTS public.product_popularity_30d AS
    SELECT
        v.product_id as id,
        v.product_name as name,
        v.product_sku as sku,
        p.images[1] as image_url,
        p.category_name,
        COUNT(*)::int as view_count
    FROM public.product_views v
    LEFT JOIN public.products p ON (
        CASE
            WHEN v.product_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN v.product_id::uuid
            ELSE NULL
        END
    ) = p.id
    WHERE v.created_at > now() - interval '30 days'
    GROUP BY v.product_id, v.product_name, v.product_sku, p.images[1], p.category_name
    ORDER BY view_count DESC
  $sql$;

  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_product_popularity_id ON public.product_popularity_30d (id)';
  EXECUTE 'GRANT SELECT ON public.product_popularity_30d TO authenticated';
  EXECUTE 'GRANT SELECT ON public.product_popularity_30d TO anon';
  EXECUTE 'GRANT ALL ON public.product_popularity_30d TO service_role';
END $$;

CREATE OR REPLACE FUNCTION public.refresh_product_popularity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname='public' AND c.relname='product_popularity_30d' AND c.relkind='m'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.product_popularity_30d;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_product_popularity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_product_popularity() TO service_role;
