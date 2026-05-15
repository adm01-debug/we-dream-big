
-- 1. category_icons
CREATE TABLE IF NOT EXISTS public.category_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  icon text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Anyone can read category icons') THEN
    CREATE POLICY "Anyone can read category icons" ON public.category_icons FOR SELECT USING (true);
  END IF;
END $$;

-- 2. product_views (analytics)
CREATE TABLE IF NOT EXISTS public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  product_sku text,
  product_name text,
  seller_id uuid,
  view_type text DEFAULT 'detail',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='Users can insert own views') THEN
    CREATE POLICY "Users can insert own views" ON public.product_views FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='Users can read own views') THEN
    CREATE POLICY "Users can read own views" ON public.product_views FOR SELECT TO authenticated USING (seller_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_views' AND policyname='Admins can read all views') THEN
    CREATE POLICY "Admins can read all views" ON public.product_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3. product_groups
CREATE TABLE IF NOT EXISTS public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text NOT NULL,
  group_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_groups' AND policyname='Authenticated users can read groups') THEN
    CREATE POLICY "Authenticated users can read groups" ON public.product_groups FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_groups' AND policyname='Admins can manage groups') THEN
    CREATE POLICY "Admins can manage groups" ON public.product_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 4. product_group_members
CREATE TABLE IF NOT EXISTS public.product_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_group_id uuid REFERENCES public.product_groups(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  use_group_rules boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_group_members' AND policyname='Authenticated users can read members') THEN
    CREATE POLICY "Authenticated users can read members" ON public.product_group_members FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_group_members' AND policyname='Admins can manage members') THEN
    CREATE POLICY "Admins can manage members" ON public.product_group_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 5. product_components
CREATE TABLE IF NOT EXISTS public.product_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  component_code text NOT NULL,
  component_name text NOT NULL,
  is_personalizable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_components' AND policyname='Authenticated users can read components') THEN
    CREATE POLICY "Authenticated users can read components" ON public.product_components FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_components' AND policyname='Admins can manage components') THEN
    CREATE POLICY "Admins can manage components" ON public.product_components FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 6. order_items (for recommendations/analytics)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  product_id text,
  product_sku text,
  product_name text,
  product_image_url text,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Authenticated users can read order items') THEN
    CREATE POLICY "Authenticated users can read order items" ON public.order_items FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Admins can manage order items') THEN
    CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
