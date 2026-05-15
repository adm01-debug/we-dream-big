-- Habilita pg_trgm para similaridade textual
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RPC: busca semântica/textual de produtos
-- Recebe a query do usuário + lista de produtos (JSONB) e retorna ranking
-- Mantém SSOT: produtos vivem no banco externo (Promobrind), aqui só rankeamos
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  _query text,
  _products jsonb,
  _limit int DEFAULT 20
)
RETURNS TABLE(
  product_id text,
  score real,
  matched_field text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Permite execução por usuários autenticados
REVOKE ALL ON FUNCTION public.search_products_semantic(text, jsonb, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_products_semantic(text, jsonb, int) TO authenticated, anon;