-- ============================================================
-- BI Real Data Layer — Fase 1
-- RPCs para afinidade do cliente e tendências setoriais
-- agregadas a partir de quote_items (proxy de "interesse confirmado")
-- ============================================================

-- 1) Top produtos comprados/orçados por um cliente específico
-- Usado para gerar "afinidade" e sugerir similares
CREATE OR REPLACE FUNCTION public.get_client_top_products(
  _client_id text,
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  product_id text,
  product_name text,
  product_image_url text,
  total_quantity bigint,
  occurrences bigint,
  total_revenue numeric,
  avg_unit_price numeric,
  last_quoted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qi.product_id,
    qi.product_name,
    MAX(qi.product_image_url) AS product_image_url,
    SUM(qi.quantity)::bigint AS total_quantity,
    COUNT(DISTINCT qi.quote_id)::bigint AS occurrences,
    SUM(COALESCE(qi.subtotal, qi.quantity * qi.unit_price))::numeric AS total_revenue,
    AVG(qi.unit_price)::numeric AS avg_unit_price,
    MAX(q.created_at) AS last_quoted_at
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id::text = _client_id
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND (
      q.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  GROUP BY qi.product_id, qi.product_name
  ORDER BY total_quantity DESC, occurrences DESC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_client_top_products(text, integer) TO authenticated;

-- 2) Top produtos vendidos para um conjunto de empresas (mesmo ramo)
-- _company_ids resolvido client-side via CRM (companies.ramo_atividade)
CREATE OR REPLACE FUNCTION public.get_industry_top_products(
  _company_ids text[],
  _days integer DEFAULT 90,
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  product_id text,
  product_name text,
  product_image_url text,
  total_quantity bigint,
  unique_clients bigint,
  unique_sellers bigint,
  total_revenue numeric,
  avg_unit_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qi.product_id,
    qi.product_name,
    MAX(qi.product_image_url) AS product_image_url,
    SUM(qi.quantity)::bigint AS total_quantity,
    COUNT(DISTINCT q.client_id)::bigint AS unique_clients,
    COUNT(DISTINCT q.seller_id)::bigint AS unique_sellers,
    SUM(COALESCE(qi.subtotal, qi.quantity * qi.unit_price))::numeric AS total_revenue,
    AVG(qi.unit_price)::numeric AS avg_unit_price
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id::text = ANY(_company_ids)
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND q.created_at >= now() - (GREATEST(_days, 1) || ' days')::interval
    AND (
      auth.uid() IS NOT NULL  -- qualquer usuário autenticado vê tendências do setor
    )
  GROUP BY qi.product_id, qi.product_name
  ORDER BY total_quantity DESC, unique_clients DESC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_industry_top_products(text[], integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_client_top_products IS 'BI: top produtos orçados/aprovados por cliente. Restrito ao próprio vendedor ou admin/manager.';
COMMENT ON FUNCTION public.get_industry_top_products IS 'BI: top produtos vendidos para um conjunto de empresas (mesmo ramo de atividade). Visível a qualquer autenticado.';