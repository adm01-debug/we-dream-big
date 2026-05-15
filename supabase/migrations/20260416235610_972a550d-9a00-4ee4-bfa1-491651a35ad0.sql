CREATE OR REPLACE FUNCTION public.search_records_rerank(
  _query text,
  _candidates jsonb
)
RETURNS TABLE(id text, score real, matched_field text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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