-- Completar migração - adicionar policies que faltam com DROP IF EXISTS

-- Drop e recriar policies de user_onboarding
DROP POLICY IF EXISTS "Users can view their own onboarding" ON public.user_onboarding;
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON public.user_onboarding;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can view their own onboarding') THEN
    CREATE POLICY "Users can view their own onboarding"
      ON public.user_onboarding FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can manage their own onboarding') THEN
    CREATE POLICY "Users can manage their own onboarding"
      ON public.user_onboarding FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Adicionar campos que podem estar faltando em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS on_sale boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'in_stock';

-- Adicionar campos em quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_time text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Adicionar campos em quote_items
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS personalization_type text,
  ADD COLUMN IF NOT EXISTS personalization_colors integer,
  ADD COLUMN IF NOT EXISTS personalization_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personalization_notes text,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Atualizar handle_new_user para incluir novos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile with new fields
  INSERT INTO public.profiles (user_id, full_name, email, role, is_active)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    'seller',
    true
  );
  
  -- Assign default role (vendedor)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  
  -- Create onboarding record
  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create gamification record
  INSERT INTO public.seller_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;