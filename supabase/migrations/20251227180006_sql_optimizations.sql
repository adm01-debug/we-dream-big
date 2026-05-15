-- Migration: Otimizações SQL - Índices para Performance
-- Data: 2025-12-27
-- Impacto: Melhora drasticamente performance de queries

-- ========================================
-- PRODUTOS
-- ========================================

-- Índices para filtros comuns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='category') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_category') THEN
      EXECUTE 'CREATE INDEX idx_products_category ON products(category)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_price') THEN
      EXECUTE 'CREATE INDEX idx_products_price ON products(price)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='stock_quantity') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_stock') THEN
      EXECUTE 'CREATE INDEX idx_products_stock ON products(stock_quantity)';
    END IF;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('portuguese', name));

-- Índice composto para buscas com ordenação
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='category')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_category_price') THEN
      EXECUTE 'CREATE INDEX idx_products_category_price ON products(category, price)';
    END IF;
  END IF;
END $$;

-- ========================================
-- ORÇAMENTOS
-- ========================================

-- Índices essenciais
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='seller_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_quotes_sales_rep') THEN
      EXECUTE 'CREATE INDEX idx_quotes_sales_rep ON quotes(seller_id)';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);

-- Índice composto para dashboard
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON quotes(status, created_at DESC);

-- Índice para busca por número
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);

-- ========================================
-- ITENS DE ORÇAMENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id);

-- ========================================
-- PEDIDOS
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivery_date') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_orders_delivery') THEN
      EXECUTE 'CREATE INDEX idx_orders_delivery ON orders(delivery_date)';
    END IF;
  END IF;
END $$;

-- Índice para busca por número
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ========================================
-- CLIENTES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_clients_name_search ON bitrix_clients USING gin(to_tsvector('portuguese', name));
CREATE INDEX IF NOT EXISTS idx_clients_email ON bitrix_clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON bitrix_clients(segment);

-- ========================================
-- HISTÓRICOS
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_history_quote ON quote_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created ON quote_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);

-- ========================================
-- COLEÇÕES
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='user_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_collections_user') THEN
      EXECUTE 'CREATE INDEX idx_collections_user ON public.collections(user_id)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_collection_items_collection') THEN
      EXECUTE 'CREATE INDEX idx_collection_items_collection ON collection_items(collection_id)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_collection_items_product') THEN
      EXECUTE 'CREATE INDEX idx_collection_items_product ON collection_items(product_id)';
    END IF;
  END IF;
END $$;

-- ========================================
-- GAMIFICAÇÃO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_sales_goals_user ON sales_goals(user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_goals' AND column_name='deadline') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_sales_goals_deadline') THEN
      EXECUTE 'CREATE INDEX idx_sales_goals_deadline ON sales_goals(deadline)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_achievements') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_achievements_user') THEN
      EXECUTE 'CREATE INDEX idx_user_achievements_user ON user_achievements(user_id)';
    END IF;
  END IF;
END $$;

-- ========================================
-- NOTIFICAÇÕES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Índice composto para inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ========================================
-- COMENTÁRIOS E TAGS
-- ========================================

CREATE INDEX IF NOT EXISTS idx_quote_comments_quote ON quote_comments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_created ON quote_comments(created_at);

-- GIN index para tags (busca rápida em arrays)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='tags') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_quotes_tags') THEN
      EXECUTE 'CREATE INDEX idx_quotes_tags ON quotes USING gin(tags)';
    END IF;
  END IF;
END $$;

-- ========================================
-- STATISTICS
-- ========================================

-- Atualizar estatísticas para melhor query planning
ANALYZE products;
ANALYZE quotes;
ANALYZE quote_items;
ANALYZE orders;
ANALYZE bitrix_clients;

-- ========================================
-- COMENTÁRIOS
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_products_name_search') THEN
    EXECUTE 'COMMENT ON INDEX idx_products_name_search IS ''Full-text search em nomes de produtos (português)''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_quotes_status_created') THEN
    EXECUTE 'COMMENT ON INDEX idx_quotes_status_created IS ''Índice composto para dashboard de orçamentos''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_notifications_user_unread') THEN
    EXECUTE 'COMMENT ON INDEX idx_notifications_user_unread IS ''Otimiza inbox de notificações não lidas''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_quotes_tags') THEN
    EXECUTE 'COMMENT ON INDEX idx_quotes_tags IS ''Busca rápida por tags usando GIN index''';
  END IF;
END $$;
