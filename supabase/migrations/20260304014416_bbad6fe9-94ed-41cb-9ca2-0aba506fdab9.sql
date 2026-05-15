
-- 1) user_onboarding
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_completed_tour boolean NOT NULL DEFAULT false,
  current_step integer NOT NULL DEFAULT 0,
  completed_steps jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can view own onboarding') THEN
    CREATE POLICY "Users can view own onboarding" ON public.user_onboarding FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can insert own onboarding') THEN
    CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_onboarding' AND policyname='Users can update own onboarding') THEN
    CREATE POLICY "Users can update own onboarding" ON public.user_onboarding FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- 2) expert_conversations
CREATE TABLE IF NOT EXISTS public.expert_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  title text NOT NULL DEFAULT 'Nova Conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expert_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expert_conversations' AND policyname='Users can manage own conversations') THEN
    CREATE POLICY "Users can manage own conversations" ON public.expert_conversations FOR ALL USING (seller_id = auth.uid());
  END IF;
END $$;

-- 3) expert_messages
CREATE TABLE IF NOT EXISTS public.expert_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.expert_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expert_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expert_messages' AND policyname='Users can manage own messages') THEN
    CREATE POLICY "Users can manage own messages" ON public.expert_messages FOR ALL
      USING (EXISTS (SELECT 1 FROM public.expert_conversations c WHERE c.id = conversation_id AND c.seller_id = auth.uid()));
  END IF;
END $$;

-- 4) seller_carts
CREATE TABLE IF NOT EXISTS public.seller_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  company_name text NOT NULL,
  company_location text,
  company_logo_url text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_carts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seller_carts' AND policyname='Users can manage own carts') THEN
    CREATE POLICY "Users can manage own carts" ON public.seller_carts FOR ALL USING (seller_id = auth.uid());
  END IF;
END $$;

-- 5) seller_cart_items
CREATE TABLE IF NOT EXISTS public.seller_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.seller_carts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_sku text,
  product_image_url text,
  product_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  color_name text,
  color_hex text,
  notes text,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seller_cart_items' AND policyname='Users can manage own cart items') THEN
    CREATE POLICY "Users can manage own cart items" ON public.seller_cart_items FOR ALL
      USING (EXISTS (SELECT 1 FROM public.seller_carts c WHERE c.id = cart_id AND c.seller_id = auth.uid()));
  END IF;
END $$;
