
-- Carrinhos de vendedor (máx 3 por vendedor)
CREATE TABLE IF NOT EXISTS public.seller_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  company_id TEXT NOT NULL,          -- ID da empresa no CRM externo
  company_name TEXT NOT NULL,        -- Cache do nome para exibição
  company_location TEXT,             -- "Cidade/Estado" cache
  company_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do carrinho
CREATE TABLE IF NOT EXISTS public.seller_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES public.seller_carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image_url TEXT,
  product_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  color_name TEXT,
  color_hex TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_carts_seller ON public.seller_carts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_cart_items_cart ON public.seller_cart_items(cart_id);

-- RLS
ALTER TABLE public.seller_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_cart_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_carts' AND policyname = 'Sellers manage own carts') THEN
    CREATE POLICY "Sellers manage own carts"
      ON public.seller_carts FOR ALL
      USING (auth.uid() = seller_id)
      WITH CHECK (auth.uid() = seller_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_cart_items' AND policyname = 'Sellers manage own cart items') THEN
    CREATE POLICY "Sellers manage own cart items"
      ON public.seller_cart_items FOR ALL
      USING (cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid()))
      WITH CHECK (cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid()));
  END IF;
END $$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_seller_carts_updated_at ON public.seller_carts;
CREATE TRIGGER update_seller_carts_updated_at
  BEFORE UPDATE ON public.seller_carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_cart_items_updated_at ON public.seller_cart_items;
CREATE TRIGGER update_seller_cart_items_updated_at
  BEFORE UPDATE ON public.seller_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limitar a 3 carrinhos por vendedor
CREATE OR REPLACE FUNCTION public.check_seller_cart_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.seller_carts WHERE seller_id = NEW.seller_id) >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 carrinhos simultâneos atingido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_seller_cart_limit ON public.seller_carts;
CREATE TRIGGER enforce_seller_cart_limit
  BEFORE INSERT ON public.seller_carts
  FOR EACH ROW EXECUTE FUNCTION public.check_seller_cart_limit();
