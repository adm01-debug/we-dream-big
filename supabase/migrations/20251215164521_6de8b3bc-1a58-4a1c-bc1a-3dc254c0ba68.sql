-- Create table for product view analytics
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_sku TEXT,
  product_name TEXT NOT NULL,
  seller_id UUID NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'detail', -- 'detail', 'card', 'compare', 'favorite'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for search analytics
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  seller_id UUID NOT NULL,
  filters_used JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to product_views if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_views' AND column_name='product_sku') THEN
    ALTER TABLE public.product_views ADD COLUMN product_sku TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_views' AND column_name='product_name') THEN
    ALTER TABLE public.product_views ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_views' AND column_name='seller_id') THEN
    ALTER TABLE public.product_views ADD COLUMN seller_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_views' AND column_name='view_type') THEN
    ALTER TABLE public.product_views ADD COLUMN view_type TEXT NOT NULL DEFAULT 'detail';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON public.product_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_seller_id ON public.product_views(seller_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_term ON public.search_analytics(search_term);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_views
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Sellers can create their own views') THEN
    CREATE POLICY "Sellers can create their own views"
    ON public.product_views
    FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Admins can view all product views') THEN
    CREATE POLICY "Admins can view all product views"
    ON public.product_views
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Sellers can view their own views') THEN
    CREATE POLICY "Sellers can view their own views"
    ON public.product_views
    FOR SELECT
    USING (seller_id = auth.uid());
  END IF;
END $$;

-- RLS Policies for search_analytics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Sellers can create their own searches') THEN
    CREATE POLICY "Sellers can create their own searches"
    ON public.search_analytics
    FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Admins can view all searches') THEN
    CREATE POLICY "Admins can view all searches"
    ON public.search_analytics
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Sellers can view their own searches') THEN
    CREATE POLICY "Sellers can view their own searches"
    ON public.search_analytics
    FOR SELECT
    USING (seller_id = auth.uid());
  END IF;
END $$;
