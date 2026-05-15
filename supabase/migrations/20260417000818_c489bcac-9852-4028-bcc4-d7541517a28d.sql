-- RPC: Sugestões de bundle baseadas em co-ocorrência em quote_items
CREATE OR REPLACE FUNCTION public.get_bundle_suggestions(_product_id text)
RETURNS TABLE (
  product_id text,
  product_name text,
  product_image_url text,
  cooccurrence_count bigint,
  frequency_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH anchor_quotes AS (
    SELECT DISTINCT quote_id
    FROM public.quote_items
    WHERE product_id = _product_id::uuid
  ),
  total AS (
    SELECT COUNT(*)::numeric AS n FROM anchor_quotes
  ),
  cooc AS (
    SELECT
      qi.product_id,
      MAX(qi.product_name) AS product_name,
      MAX(qi.product_image_url) AS product_image_url,
      COUNT(DISTINCT qi.quote_id) AS cnt
    FROM public.quote_items qi
    JOIN anchor_quotes aq ON aq.quote_id = qi.quote_id
    WHERE qi.product_id IS NOT NULL
      AND qi.product_id <> _product_id::uuid
    GROUP BY qi.product_id
  )
  SELECT
    c.product_id::text,
    c.product_name,
    c.product_image_url,
    c.cnt AS cooccurrence_count,
    ROUND((c.cnt::numeric / NULLIF((SELECT n FROM total), 0)) * 100, 1) AS frequency_percent
  FROM cooc c, total
  WHERE total.n >= 3
    AND (c.cnt::numeric / NULLIF(total.n, 0)) >= 0.30
  ORDER BY c.cnt DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_bundle_suggestions(text) TO authenticated;