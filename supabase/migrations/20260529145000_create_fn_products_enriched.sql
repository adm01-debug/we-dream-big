-- =====================================================================
-- RPC de catálogo enriquecido — colapsa ~46 round-trips em 1.
-- Replica a lógica de enrichProducts() (src/lib/external-db/products.ts):
--   - colors:  product_variants + product_images + color_variations/groups
--   - images:  product_images (colorImages -> generalImages, exclui 'box')
--   - supplier_name: suppliers
-- SECURITY INVOKER => RLS do chamador continua valendo (igual REST nativo).
-- Já aplicada via Supabase MCP em 2026-05-29; arquivo versionado p/ sync.
-- =====================================================================

-- 1) Imagens enriquecidas do produto -----------------------------------
CREATE OR REPLACE FUNCTION public.fn_product_images_enriched(p_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $func$
  WITH imgs AS (
    SELECT url_cdn,
           COALESCE(is_primary, false)  AS is_primary,
           COALESCE(is_og_image, false) AS is_og_image,
           image_type, supplier_code, display_order
    FROM product_images
    WHERE product_id = p_product_id
      AND is_active = true
      AND COALESCE(image_type, '') <> 'box'
  ),
  main_imgs AS (
    SELECT url_cdn, is_primary, is_og_image, image_type,
           row_number() OVER (ORDER BY (supplier_code IS NULL) ASC, display_order ASC NULLS LAST) AS rn
    FROM imgs
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM main_imgs) THEN NULL::jsonb
    ELSE jsonb_build_object(
      'images', (SELECT jsonb_agg(url_cdn ORDER BY rn) FROM main_imgs),
      'primary_image_url', COALESCE(
        (SELECT url_cdn FROM main_imgs WHERE is_primary ORDER BY rn LIMIT 1),
        (SELECT url_cdn FROM main_imgs ORDER BY rn LIMIT 1)
      ),
      'og_image_url', COALESCE(
        (SELECT url_cdn FROM main_imgs WHERE is_og_image ORDER BY rn LIMIT 1),
        (SELECT url_cdn FROM main_imgs WHERE image_type = 'main' ORDER BY rn LIMIT 1),
        (SELECT url_cdn FROM main_imgs WHERE is_primary ORDER BY rn LIMIT 1),
        (SELECT url_cdn FROM main_imgs ORDER BY rn LIMIT 1)
      )
    )
  END;
$func$;

-- 2) Cores enriquecidas do produto -------------------------------------
CREATE OR REPLACE FUNCTION public.fn_product_colors_enriched(p_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $func$
  WITH imgs AS (
    SELECT url_cdn,
           COALESCE(is_primary, false)  AS is_primary,
           COALESCE(is_og_image, false) AS is_og_image,
           supplier_code, display_order, variant_id
    FROM product_images
    WHERE product_id = p_product_id AND is_active = true
  ),
  v AS (
    SELECT DISTINCT ON (pv.color_name)
           pv.id, pv.color_name, pv.color_hex, pv.color_code, pv.color_id,
           pv.sku, pv.stock_quantity, pv.selected_thumbnail, pv.images AS legacy_images
    FROM product_variants pv
    WHERE pv.product_id = p_product_id
      AND pv.is_active = true
      AND pv.color_name IS NOT NULL
    ORDER BY pv.color_name, pv.created_at NULLS LAST
  ),
  colors AS (
    SELECT
      v.color_name, v.color_hex, v.color_code, v.sku, v.stock_quantity, v.selected_thumbnail,
      cv.slug AS variation_slug, cg.slug AS group_slug, cg.name AS group_name,
      COALESCE(
        NULLIF((SELECT jsonb_agg(i.url_cdn ORDER BY i.display_order)
                FROM imgs i WHERE i.variant_id = v.id AND NOT i.is_primary AND NOT i.is_og_image), '[]'::jsonb),
        NULLIF((SELECT jsonb_agg(i.url_cdn ORDER BY i.display_order)
                FROM imgs i WHERE v.color_code IS NOT NULL AND i.supplier_code = v.color_code
                  AND NOT i.is_primary AND NOT i.is_og_image), '[]'::jsonb),
        NULLIF((SELECT jsonb_agg(i.url_cdn ORDER BY i.display_order)
                FROM imgs i WHERE i.variant_id = v.id), '[]'::jsonb),
        CASE WHEN jsonb_typeof(v.legacy_images) = 'array' THEN v.legacy_images ELSE '[]'::jsonb END
      ) AS final_images
    FROM v
    LEFT JOIN color_variations cv ON cv.id = v.color_id
    LEFT JOIN color_groups cg ON cg.id = cv.group_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',          color_name,
    'hex',           COALESCE(color_hex, '#CCCCCC'),
    'code',          COALESCE(color_code, ''),
    'sku',           sku,
    'stock',         stock_quantity,
    'image',         COALESCE(final_images->>0, selected_thumbnail),
    'images',        CASE WHEN jsonb_array_length(final_images) > 0 THEN final_images ELSE NULL END,
    'groupSlug',     group_slug,
    'groupName',     group_name,
    'variationSlug', variation_slug
  ) ORDER BY color_name), '[]'::jsonb)
  FROM colors;
$func$;

-- 3) Catálogo enriquecido paginado em UMA chamada ----------------------
CREATE OR REPLACE FUNCTION public.fn_products_enriched(
  p_limit            integer DEFAULT 60,
  p_offset           integer DEFAULT 0,
  p_search           text    DEFAULT NULL,
  p_main_category_id uuid    DEFAULT NULL,
  p_supplier_id      uuid    DEFAULT NULL,
  p_active           boolean DEFAULT true,
  p_order_by         text    DEFAULT 'name',
  p_order_dir        text    DEFAULT 'asc',
  p_with_count       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $body$
DECLARE
  v_order_col text;
  v_order_dir text;
  v_where     text := 'WHERE TRUE';
  v_sql       text;
  v_raw       jsonb;
  v_products  jsonb;
  v_count     bigint := NULL;
BEGIN
  v_order_col := CASE lower(COALESCE(p_order_by, 'name'))
    WHEN 'name'             THEN 'p.name'
    WHEN 'created_at'       THEN 'p.created_at'
    WHEN 'updated_at'       THEN 'p.updated_at'
    WHEN 'sale_price'       THEN 'p.sale_price'
    WHEN 'price_updated_at' THEN 'p.price_updated_at'
    ELSE 'p.name'
  END;
  v_order_dir := CASE WHEN lower(COALESCE(p_order_dir, 'asc')) = 'desc' THEN 'DESC' ELSE 'ASC' END;

  IF p_active IS NOT NULL THEN
    v_where := v_where || format(' AND p.active = %L', p_active);
  END IF;
  IF p_main_category_id IS NOT NULL THEN
    v_where := v_where || format(' AND p.main_category_id = %L', p_main_category_id);
  END IF;
  IF p_supplier_id IS NOT NULL THEN
    v_where := v_where || format(' AND p.supplier_id = %L', p_supplier_id);
  END IF;
  IF p_search IS NOT NULL AND length(btrim(p_search)) > 0 THEN
    v_where := v_where || format(' AND (p.name ILIKE %L OR p.sku ILIKE %L)',
                                 '%' || p_search || '%', '%' || p_search || '%');
  END IF;

  IF p_with_count THEN
    EXECUTE format('SELECT count(*) FROM products p %s', v_where) INTO v_count;
  END IF;

  v_sql := format(
       'WITH page AS ('
    || '  SELECT p.*, row_number() OVER (ORDER BY %1$s %2$s) AS _ord'
    || '  FROM products p %3$s'
    || '  ORDER BY %1$s %2$s'
    || '  LIMIT %4$s OFFSET %5$s'
    || ') '
    || 'SELECT COALESCE(jsonb_agg('
    || '  (to_jsonb(pg) - ''_ord'')'
    || '  || jsonb_build_object('
    || '       ''supplier_name'', (SELECT s.name FROM suppliers s WHERE s.id = pg.supplier_id),'
    || '       ''_colors'', public.fn_product_colors_enriched(pg.id),'
    || '       ''_img'',    public.fn_product_images_enriched(pg.id)'
    || '     )'
    || '  ORDER BY pg._ord), ''[]''::jsonb) FROM page pg',
    v_order_col, v_order_dir, v_where,
    COALESCE(p_limit::text, 'ALL'), GREATEST(COALESCE(p_offset, 0), 0)
  );

  EXECUTE v_sql INTO v_raw;
  IF v_raw IS NULL THEN v_raw := '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(
    (elem - '_img' - '_colors')
    || CASE
         WHEN jsonb_typeof(elem->'_img') = 'object' THEN
           jsonb_build_object(
             'images',            elem->'_img'->'images',
             'primary_image_url', elem->'_img'->>'primary_image_url',
             'og_image_url',      elem->'_img'->>'og_image_url',
             'image_url',         elem->'_img'->>'primary_image_url'
           )
         ELSE '{}'::jsonb
       END
    || CASE
         WHEN jsonb_typeof(elem->'_colors') = 'array' AND jsonb_array_length(elem->'_colors') > 0
         THEN jsonb_build_object('colors', elem->'_colors')
         ELSE '{}'::jsonb
       END
    ORDER BY ord), '[]'::jsonb)
  INTO v_products
  FROM jsonb_array_elements(v_raw) WITH ORDINALITY AS t(elem, ord);

  RETURN jsonb_build_object('products', v_products, 'count', v_count);
END;
$body$;

GRANT EXECUTE ON FUNCTION public.fn_product_images_enriched(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_product_colors_enriched(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_products_enriched(integer,integer,text,uuid,uuid,boolean,text,text,boolean) TO anon, authenticated;
