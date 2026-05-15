
-- Create order status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'in_production',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled'
);
  END IF;
END $$;

-- Create fulfillment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.fulfillment_status AS ENUM (
  'not_started',
  'picking',
  'packing',
  'shipped',
  'delivered'
);
  END IF;
END $$;

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  quote_id UUID REFERENCES public.quotes(id),
  client_id UUID REFERENCES public.bitrix_clients(id),
  seller_id UUID NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'not_started',
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  shipping_address TEXT,
  shipping_method TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  paid_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_sku TEXT,
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  color_name TEXT,
  color_hex TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC,
  notes TEXT,
  personalization_details JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order history table for tracking changes
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to orders if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='seller_id') THEN
    ALTER TABLE public.orders ADD COLUMN seller_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='discount_percent') THEN
    ALTER TABLE public.orders ADD COLUMN discount_percent NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='internal_notes') THEN
    ALTER TABLE public.orders ADD COLUMN internal_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipping_method') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_number') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tracking_url') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='estimated_delivery_date') THEN
    ALTER TABLE public.orders ADD COLUMN estimated_delivery_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='actual_delivery_date') THEN
    ALTER TABLE public.orders ADD COLUMN actual_delivery_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='confirmed_at') THEN
    ALTER TABLE public.orders ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='shipped_at') THEN
    ALTER TABLE public.orders ADD COLUMN shipped_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at') THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  END IF;
END $$;

-- Add missing columns to order_items if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='personalization_details') THEN
    ALTER TABLE public.order_items ADD COLUMN personalization_details JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='sort_order') THEN
    ALTER TABLE public.order_items ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- CREATE OR REPLACE function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'PED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for order number
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can view their own orders') THEN
    CREATE POLICY "Sellers can view their own orders"
      ON public.orders FOR SELECT
      USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can create orders') THEN
    CREATE POLICY "Sellers can create orders"
      ON public.orders FOR INSERT
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Sellers can update their own orders') THEN
    CREATE POLICY "Sellers can update their own orders"
      ON public.orders FOR UPDATE
      USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can delete orders') THEN
    CREATE POLICY "Admins can delete orders"
      ON public.orders FOR DELETE
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- RLS Policies for order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Users can view items of their orders') THEN
    CREATE POLICY "Users can view items of their orders"
      ON public.order_items FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Users can manage items of their orders') THEN
    CREATE POLICY "Users can manage items of their orders"
      ON public.order_items FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      ));
  END IF;
END $$;

-- RLS Policies for order_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_history' AND policyname = 'Users can view history of their orders') THEN
    CREATE POLICY "Users can view history of their orders"
      ON public.order_history FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_history.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_history' AND policyname = 'Users can create history for their orders') THEN
    CREATE POLICY "Users can create history for their orders"
      ON public.order_history FOR INSERT
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_history.order_id
        AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      ));
  END IF;
END $$;

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
