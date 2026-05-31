-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    trading_name TEXT,
    logo_url TEXT,
    website TEXT,
    active BOOLEAN DEFAULT true,
    is_product_supplier BOOLEAN DEFAULT true,
    is_engraving_supplier BOOLEAN DEFAULT false,
    state_uf TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    name TEXT,
    color_id TEXT,
    color_name TEXT,
    color_hex TEXT,
    color_code TEXT,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variant_supplier_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    next_quantity_1 INTEGER,
    next_date_1 DATE,
    next_quantity_2 INTEGER,
    next_date_2 DATE,
    next_quantity_3 INTEGER,
    next_date_3 DATE,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_supplier_sources ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.suppliers TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.product_variants TO authenticated;
GRANT SELECT ON public.variant_supplier_sources TO authenticated;

GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.variant_supplier_sources TO anon;

-- Basic Policies
CREATE POLICY "Suppliers are viewable by everyone" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Product variants are viewable by everyone" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Variant supplier sources are viewable by everyone" ON public.variant_supplier_sources FOR SELECT USING (true);

-- Create or Replace Views
CREATE OR REPLACE VIEW public.v_products_public AS
SELECT 
    id, name, sku, description, price, stock_quantity, 
    category_id, supplier_id, is_active, is_kit, updated_at,
    NULL as cost_price -- Mascarando custo conforme Etapa 3 C2
FROM public.products;

CREATE OR REPLACE VIEW public.v_suppliers_public AS
SELECT 
    id, name, code, trading_name, logo_url, website, active, 
    is_product_supplier, is_engraving_supplier, state_uf 
FROM public.suppliers;

-- View Permissions
GRANT SELECT ON public.v_products_public TO anon, authenticated;
GRANT SELECT ON public.v_suppliers_public TO anon, authenticated;

-- Ensure RLS doesn't block views (though security_invoker defaults to false, we can be explicit)
ALTER VIEW public.v_products_public SET (security_invoker = false);
ALTER VIEW public.v_suppliers_public SET (security_invoker = false);
