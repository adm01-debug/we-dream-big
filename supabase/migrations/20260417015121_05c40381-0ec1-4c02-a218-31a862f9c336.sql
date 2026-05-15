-- Sazonalidade por cliente: agrega quotes por (year, month) nos últimos N meses
CREATE OR REPLACE FUNCTION public.get_client_seasonality(
  _client_id text,
  _months int DEFAULT 24
)
RETURNS TABLE(
  year int,
  month int,
  quotes_count bigint,
  total_revenue numeric,
  avg_ticket numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR FROM q.created_at)::int AS year,
    EXTRACT(MONTH FROM q.created_at)::int AS month,
    COUNT(*)::bigint AS quotes_count,
    COALESCE(SUM(q.total), 0)::numeric AS total_revenue,
    COALESCE(AVG(q.total), 0)::numeric AS avg_ticket
  FROM public.quotes q
  WHERE q.client_id::text = _client_id
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
    AND (
      q.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- Sazonalidade do setor: média mensal por empresa, entre empresas do mesmo ramo
CREATE OR REPLACE FUNCTION public.get_industry_seasonality(
  _company_ids text[],
  _months int DEFAULT 24
)
RETURNS TABLE(
  year int,
  month int,
  avg_quotes_per_company numeric,
  avg_revenue_per_company numeric,
  companies_active bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_client_month AS (
    SELECT
      q.client_id,
      EXTRACT(YEAR FROM q.created_at)::int AS y,
      EXTRACT(MONTH FROM q.created_at)::int AS m,
      COUNT(*)::numeric AS qc,
      COALESCE(SUM(q.total), 0)::numeric AS rev
    FROM public.quotes q
    WHERE q.client_id::text = ANY(_company_ids)
      AND q.status IN ('sent','viewed','approved','converted','pending_approval')
      AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
      AND auth.uid() IS NOT NULL
    GROUP BY q.client_id, 2, 3
  )
  SELECT
    y AS year,
    m AS month,
    AVG(qc)::numeric AS avg_quotes_per_company,
    AVG(rev)::numeric AS avg_revenue_per_company,
    COUNT(DISTINCT client_id)::bigint AS companies_active
  FROM per_client_month
  GROUP BY y, m
  ORDER BY y, m;
$$;