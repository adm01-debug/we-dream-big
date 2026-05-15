
-- P1 #5: Profiles INSERT policy (for edge cases beyond trigger)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- P2 #6: category_icons admin write policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'category_icons' AND policyname = 'Admins can insert category icons') THEN
    CREATE POLICY "Admins can insert category icons"
      ON public.category_icons FOR INSERT
      TO authenticated
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'category_icons' AND policyname = 'Admins can update category icons') THEN
    CREATE POLICY "Admins can update category icons"
      ON public.category_icons FOR UPDATE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'category_icons' AND policyname = 'Admins can delete category icons') THEN
    CREATE POLICY "Admins can delete category icons"
      ON public.category_icons FOR DELETE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- P2 #7: user_onboarding DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can delete own onboarding') THEN
    CREATE POLICY "Users can delete own onboarding"
      ON public.user_onboarding FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- P2 #8: quote_comments — add manager visibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Managers can read all comments') THEN
    CREATE POLICY "Managers can read all comments"
      ON public.quote_comments FOR SELECT
      TO authenticated
      USING (is_manager_or_admin());
  END IF;
END $$;

-- P3 #12: product_price_history UPDATE for admins
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Admins can update price history') THEN
    CREATE POLICY "Admins can update price history"
      ON public.product_price_history FOR UPDATE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
