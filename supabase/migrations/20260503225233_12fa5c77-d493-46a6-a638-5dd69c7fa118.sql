-- Optimize product analytics
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Optimize dashboard and list filtering
CREATE INDEX IF NOT EXISTS idx_quotes_client_status ON public.quotes(client_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON public.orders(client_id, status);

-- Support faster searching in JSONB audit logs (using correct 'details' column)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_details_gin ON public.admin_audit_log USING GIN (details);

-- Refresh statistics
ANALYZE public.product_views;
ANALYZE public.order_items;
ANALYZE public.quotes;
ANALYZE public.orders;
ANALYZE public.admin_audit_log;