-- Migration: Add Soft Delete Support
-- Adiciona suporte para soft delete em todas as tabelas principais
-- Data: 2026-01-02

-- ==============================================================================
-- 1. ADICIONAR COLUNA deleted_at NAS TABELAS PRINCIPAIS
-- ==============================================================================

-- Produtos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Clientes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clients') THEN
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Fornecedores
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Orçamentos (Quotes)
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Pedidos (Orders)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Coleções
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Categorias
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ==============================================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) 
WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clients') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_clients_deleted_at') THEN
      EXECUTE 'CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at) WHERE deleted_at IS NULL';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON public.suppliers(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON public.quotes(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON public.collections(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at) 
WHERE deleted_at IS NULL;

-- ==============================================================================
-- 3. FUNÇÃO AUXILIAR: Soft Delete
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_record(
    p_table_name TEXT,
    p_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Validar nome da tabela
    IF p_table_name NOT IN ('products', 'clients', 'suppliers', 'quotes', 'orders', 'collections', 'categories') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;
    
    -- Executar soft delete
    v_sql := format(
        'UPDATE public.%I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        p_table_name
    );
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. FUNÇÃO AUXILIAR: Restore (Undelete)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.restore_record(
    p_table_name TEXT,
    p_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Validar nome da tabela
    IF p_table_name NOT IN ('products', 'clients', 'suppliers', 'quotes', 'orders', 'collections', 'categories') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;
    
    -- Executar restore
    v_sql := format(
        'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id',
        p_table_name
    );
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. FUNÇÃO AUXILIAR: Permanent Delete
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.permanent_delete_record(
    p_table_name TEXT,
    p_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Validar nome da tabela
    IF p_table_name NOT IN ('products', 'clients', 'suppliers', 'quotes', 'orders', 'collections', 'categories') THEN
        RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END IF;
    
    -- Executar delete permanente
    v_sql := format(
        'DELETE FROM public.%I WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id',
        p_table_name
    );
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================================================

COMMENT ON FUNCTION public.soft_delete_record IS 'Marca um registro como deletado (soft delete)';
COMMENT ON FUNCTION public.restore_record IS 'Restaura um registro deletado';
COMMENT ON FUNCTION public.permanent_delete_record IS 'Deleta permanentemente um registro (apenas se já estiver soft deleted)';
