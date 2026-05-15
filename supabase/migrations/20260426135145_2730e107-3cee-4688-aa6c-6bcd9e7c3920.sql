-- Índices compostos para listagens filtradas por seller_id no dashboard
-- (My Quotes / My Orders / Discount Requests / My Clients)
-- Padrão: WHERE seller_id = ? [AND status IN/=] ORDER BY updated_at|created_at DESC LIMIT N
-- + cursor (updated_at|created_at) < ?

-- QUOTES: ORDER BY updated_at DESC com cursor
CREATE INDEX IF NOT EXISTS idx_quotes_seller_updated_at
  ON public.quotes (seller_id, updated_at DESC);

-- QUOTES: filtro status + ordenação updated_at (cobre filtro do widget)
CREATE INDEX IF NOT EXISTS idx_quotes_seller_status_updated_at
  ON public.quotes (seller_id, status, updated_at DESC);

-- ORDERS: ORDER BY updated_at DESC + cursor
CREATE INDEX IF NOT EXISTS idx_orders_seller_updated_at
  ON public.orders (seller_id, updated_at DESC);

-- ORDERS: WHERE seller_id AND status IN (...) ORDER BY updated_at DESC
-- (substitui uso parcial de idx_orders_seller_status para ordenação)
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_updated_at
  ON public.orders (seller_id, status, updated_at DESC);

-- DISCOUNT_APPROVAL_REQUESTS: ORDER BY created_at DESC + cursor
CREATE INDEX IF NOT EXISTS idx_dar_seller_created_at
  ON public.discount_approval_requests (seller_id, created_at DESC);

-- DISCOUNT_APPROVAL_REQUESTS: filtro status + created_at
CREATE INDEX IF NOT EXISTS idx_dar_seller_status_created_at
  ON public.discount_approval_requests (seller_id, status, created_at DESC);

-- Atualiza estatísticas para que o planner adote os novos índices imediatamente
ANALYZE public.quotes;
ANALYZE public.orders;
ANALYZE public.discount_approval_requests;