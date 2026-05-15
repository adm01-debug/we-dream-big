-- Migration: Gifts Store - Tabelas de Produção

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  lead_time INTEGER DEFAULT 7,
  min_order NUMERIC(10,2) DEFAULT 0,
  payment_terms TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  category_id UUID REFERENCES public.categories(id),
  subcategory TEXT,
  colors TEXT[],
  materials TEXT[],
  supplier_id UUID REFERENCES public.suppliers(id),
  stock INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in-stock' CHECK (stock_status IN ('in-stock', 'low-stock', 'out-of-stock')),
  is_kit BOOLEAN DEFAULT FALSE,
  images TEXT[],
  video TEXT,
  tags JSONB DEFAULT '{}',
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Orçamentos
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'approved', 'rejected', 'expired')),
  notes TEXT,
  valid_until DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.categories;
CREATE POLICY "Allow all" ON public.categories FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow all" ON public.suppliers;
CREATE POLICY "Allow all" ON public.suppliers FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow all" ON public.products;
CREATE POLICY "Allow all" ON public.products FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow all" ON public.quotes;
CREATE POLICY "Allow all" ON public.quotes FOR ALL USING (true);
