-- FIX 1: profiles - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles') THEN
    CREATE POLICY "Admins can view all profiles"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- FIX 2: order_items - Remove open SELECT, keep admin-only
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Admins can manage order items') THEN
    CREATE POLICY "Admins can manage order items"
      ON public.order_items FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- FIX 3: product_views - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can read all views" ON public.product_views;
DROP POLICY IF EXISTS "Users can read own views" ON public.product_views;
DROP POLICY IF EXISTS "Users can insert own views" ON public.product_views;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Users can view own views') THEN
    CREATE POLICY "Users can view own views"
      ON public.product_views FOR SELECT
      TO authenticated
      USING (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Admins can read all views') THEN
    CREATE POLICY "Admins can read all views"
      ON public.product_views FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_views' AND policyname = 'Users can insert own views') THEN
    CREATE POLICY "Users can insert own views"
      ON public.product_views FOR INSERT
      TO authenticated
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

-- FIX 4: seller_carts - Recreate as PERMISSIVE with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own carts" ON public.seller_carts;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_carts' AND policyname = 'Users can manage own carts') THEN
    CREATE POLICY "Users can manage own carts"
      ON public.seller_carts FOR ALL
      TO authenticated
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

-- FIX 5: seller_cart_items - Recreate as PERMISSIVE with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.seller_cart_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_cart_items' AND policyname = 'Users can manage own cart items') THEN
    CREATE POLICY "Users can manage own cart items"
      ON public.seller_cart_items FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM seller_carts c
        WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM seller_carts c
        WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid()
      ));
  END IF;
END $$;

-- FIX 6: user_roles - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view own role') THEN
    CREATE POLICY "Users can view own role"
      ON public.user_roles FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can manage roles') THEN
    CREATE POLICY "Admins can manage roles"
      ON public.user_roles FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
