-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.3.5_analytics_ux_extra - RPCs follow-up post merge
-- 3 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: get_bundle_suggestions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bundle_suggestions(_product_id text) RETURNS TABLE(product_id text, product_name text, product_image_url text, cooccurrence_count bigint, frequency_percent numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH anchor_quotes AS (
    SELECT DISTINCT quote_id
    FROM public.quote_items
    WHERE product_id = _product_id
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
      AND qi.product_id <> _product_id
    GROUP BY qi.product_id
  )
  SELECT
    c.product_id,
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


--

--

--

-- Name: search_products_semantic(text, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_products_semantic(_query text, _products jsonb, _limit integer DEFAULT 20) RETURNS TABLE(product_id text, score real, matched_field text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _normalized_query text;
BEGIN
  -- Validações básicas
  IF _query IS NULL OR length(trim(_query)) = 0 THEN
    RETURN;
  END IF;

  IF _products IS NULL OR jsonb_typeof(_products) <> 'array' THEN
    RETURN;
  END IF;

  _normalized_query := lower(trim(_query));

  RETURN QUERY
  WITH expanded AS (
    SELECT
      COALESCE(p->>'id', p->>'product_id', '') AS pid,
      lower(COALESCE(p->>'name', '')) AS pname,
      lower(COALESCE(p->>'description', '')) AS pdesc,
      lower(COALESCE(
        (SELECT string_agg(t::text, ' ') FROM jsonb_array_elements_text(COALESCE(p->'tags', '[]'::jsonb)) t),
        ''
      )) AS ptags,
      lower(COALESCE(p->>'category', '')) AS pcat
    FROM jsonb_array_elements(_products) AS p
  ),
  scored AS (
    SELECT
      pid,
      GREATEST(
        similarity(pname, _normalized_query) * 1.0,
        similarity(pdesc, _normalized_query) * 0.6,
        similarity(ptags, _normalized_query) * 0.8,
        similarity(pcat, _normalized_query) * 0.5
      ) AS best_score,
      CASE
        WHEN similarity(pname, _normalized_query) >= similarity(pdesc, _normalized_query)
         AND similarity(pname, _normalized_query) >= similarity(ptags, _normalized_query)
         AND similarity(pname, _normalized_query) >= similarity(pcat, _normalized_query)
          THEN 'name'
        WHEN similarity(ptags, _normalized_query) >= similarity(pdesc, _normalized_query)
         AND similarity(ptags, _normalized_query) >= similarity(pcat, _normalized_query)
          THEN 'tags'
        WHEN similarity(pdesc, _normalized_query) >= similarity(pcat, _normalized_query)
          THEN 'description'
        ELSE 'category'
      END AS field
    FROM expanded
    WHERE pid <> ''
  )
  SELECT pid, best_score::real, field
  FROM scored
  WHERE best_score > 0.05
  ORDER BY best_score DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;


--

--

--

-- Name: search_records_rerank(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_records_rerank(_query text, _candidates jsonb) RETURNS TABLE(id text, score real, matched_field text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _q text;
BEGIN
  IF _query IS NULL OR length(trim(_query)) = 0 THEN
    RETURN;
  END IF;

  IF _candidates IS NULL OR jsonb_typeof(_candidates) <> 'array' THEN
    RETURN;
  END IF;

  _q := lower(trim(_query));

  RETURN QUERY
  WITH expanded AS (
    SELECT
      COALESCE(c->>'id', '') AS cid,
      lower(COALESCE(c->>'label', '')) AS clabel,
      lower(COALESCE(c->>'sublabel', '')) AS csublabel
    FROM jsonb_array_elements(_candidates) AS c
  ),
  scored AS (
    SELECT
      cid,
      GREATEST(
        similarity(clabel, _q) * 1.0,
        word_similarity(_q, clabel) * 0.9,
        similarity(csublabel, _q) * 0.7,
        word_similarity(_q, csublabel) * 0.6
      ) AS best_score,
      CASE
        WHEN similarity(clabel, _q) >= similarity(csublabel, _q) THEN 'label'
        ELSE 'sublabel'
      END AS field
    FROM expanded
    WHERE cid <> ''
  )
  SELECT cid, best_score::real, field
  FROM scored
  WHERE best_score > 0.05
  ORDER BY best_score DESC;
END;
$$;


--

--

COMMIT;
