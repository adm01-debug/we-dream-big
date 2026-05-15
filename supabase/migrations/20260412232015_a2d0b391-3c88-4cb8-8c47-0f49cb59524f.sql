
-- Quotes: most queried by seller + status
CREATE INDEX IF NOT EXISTS idx_quotes_seller_status ON public.quotes (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON public.quotes (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);

-- Orders: most queried by seller + status
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- Quote items: always queried by quote_id
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items (quote_id);

-- Quote history: queried by quote_id + created_at
CREATE INDEX IF NOT EXISTS idx_quote_history_quote_created ON public.quote_history (quote_id, created_at DESC);

-- Notifications: queried by user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.workspace_notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.workspace_notifications (created_at DESC);

-- AI usage: queried by user + month
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage_logs (user_id, created_at DESC);

-- Product views: queried by seller + date
CREATE INDEX IF NOT EXISTS idx_product_views_seller ON public.product_views (seller_id, created_at DESC);

-- Collection items: queried by collection + order
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON public.collection_items (collection_id, sort_order);

-- Quote item personalizations: queried by item
CREATE INDEX IF NOT EXISTS idx_personalizations_item ON public.quote_item_personalizations (quote_item_id);

-- Login attempts: queried by email for rate limiting
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON public.login_attempts (email, created_at DESC);

-- Profiles: queried by user_id (unique lookup)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- User roles: queried by user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
