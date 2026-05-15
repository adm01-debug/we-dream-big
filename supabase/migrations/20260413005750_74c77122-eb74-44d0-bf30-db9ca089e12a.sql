
-- Composite indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_seller_status ON public.quotes (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_org ON public.quotes (seller_id, organization_id);

-- Composite indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_org ON public.orders (seller_id, organization_id);

-- Item lookup indexes
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- Quote approval tokens lookup
CREATE INDEX IF NOT EXISTS idx_quote_approval_tokens_quote ON public.quote_approval_tokens (quote_id, status);
