CREATE OR REPLACE FUNCTION public.get_industry_benchmark_stats(
  _company_ids text[],
  _days integer DEFAULT 180
)
RETURNS TABLE (
  total_clients_sampled bigint,
  avg_ltv numeric,
  avg_ticket numeric,
  avg_quotes_per_client numeric,
  avg_items_per_quote numeric,
  top_product_name text,
  total_revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_quotes AS (
    SELECT q.id, q.client_id, q.total
    FROM public.quotes q
    WHERE q.client_id::text = ANY(_company_ids)
      AND q.status IN ('sent','viewed','approved','converted','pending_approval')
      AND q.created_at >= now() - (GREATEST(_days, 1) || ' days')::interval
      AND auth.uid() IS NOT NULL
  ),
  per_client AS (
    SELECT
      client_id,
      SUM(total)::numeric AS client_ltv,
      COUNT(*)::numeric AS client_quote_count,
      AVG(total)::numeric AS client_avg_ticket
    FROM filtered_quotes
    GROUP BY client_id
  ),
  items_per_quote AS (
    SELECT fq.id, COUNT(qi.id)::numeric AS item_count
    FROM filtered_quotes fq
    LEFT JOIN public.quote_items qi ON qi.quote_id = fq.id
    GROUP BY fq.id
  ),
  top_product AS (
    SELECT qi.product_name, SUM(qi.quantity) AS qty
    FROM public.quote_items qi
    JOIN filtered_quotes fq ON fq.id = qi.quote_id
    GROUP BY qi.product_name
    ORDER BY qty DESC
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM per_client) AS total_clients_sampled,
    COALESCE((SELECT AVG(client_ltv) FROM per_client), 0)::numeric AS avg_ltv,
    COALESCE((SELECT AVG(client_avg_ticket) FROM per_client), 0)::numeric AS avg_ticket,
    COALESCE((SELECT AVG(client_quote_count) FROM per_client), 0)::numeric AS avg_quotes_per_client,
    COALESCE((SELECT AVG(item_count) FROM items_per_quote), 0)::numeric AS avg_items_per_quote,
    (SELECT product_name FROM top_product) AS top_product_name,
    COALESCE((SELECT SUM(client_ltv) FROM per_client), 0)::numeric AS total_revenue;
$$;

GRANT EXECUTE ON FUNCTION public.get_industry_benchmark_stats(text[], integer) TO authenticated;

COMMENT ON FUNCTION public.get_industry_benchmark_stats IS 'BI Fase 2: estatísticas agregadas de um conjunto de empresas do mesmo ramo para benchmarking cliente vs setor.';