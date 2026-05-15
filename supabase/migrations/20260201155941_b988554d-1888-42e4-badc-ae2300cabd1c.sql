-- ============================================
-- TABELA: future_stock_entries
-- Previsão de reposição de estoque por variação/cor
-- ============================================

CREATE TABLE IF NOT EXISTS public.future_stock_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referência ao produto (ID do banco externo Promobrind)
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  
  -- Variação específica (opcional - se não especificado, é para produto geral)
  variant_id TEXT,
  color_name TEXT,
  color_hex TEXT,
  variant_sku TEXT,
  
  -- Quantidade esperada
  expected_quantity INTEGER NOT NULL CHECK (expected_quantity > 0),
  
  -- Datas
  expected_date DATE NOT NULL,
  order_date DATE,
  
  -- Origem da previsão
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('purchase_order', 'production', 'transfer', 'manual')),
  source_reference TEXT, -- ID do pedido de compra, nota fiscal, etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'partial', 'completed', 'cancelled')),
  
  -- Fornecedor
  supplier_id TEXT,
  supplier_name TEXT,
  
  -- Notas
  notes TEXT,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_future_stock_product_id ON public.future_stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_future_stock_expected_date ON public.future_stock_entries(expected_date);
CREATE INDEX IF NOT EXISTS idx_future_stock_status ON public.future_stock_entries(status);
CREATE INDEX IF NOT EXISTS idx_future_stock_color ON public.future_stock_entries(color_name);

-- Enable RLS
ALTER TABLE public.future_stock_entries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos usuários autenticados podem ver
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'future_stock_entries' AND policyname = 'Authenticated users can view future stock') THEN
    CREATE POLICY "Authenticated users can view future stock"
    ON public.future_stock_entries
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Apenas gerentes e admins podem gerenciar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'future_stock_entries' AND policyname = 'Managers can manage future stock') THEN
    CREATE POLICY "Managers can manage future stock"
    ON public.future_stock_entries
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager')
      )
    );
  END IF;
END $$;

-- Vendedores podem inserir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'future_stock_entries' AND policyname = 'Sellers can insert future stock') THEN
    CREATE POLICY "Sellers can insert future stock"
    ON public.future_stock_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'manager', 'vendedor')
      )
    );
  END IF;
END $$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_future_stock_entries_updated_at ON public.future_stock_entries;
CREATE TRIGGER update_future_stock_entries_updated_at
BEFORE UPDATE ON public.future_stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();