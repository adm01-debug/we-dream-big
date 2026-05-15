CREATE TABLE IF NOT EXISTS public.magic_up_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text,
  client_name text,
  title text NOT NULL DEFAULT 'Campanha Magic Up',
  objective text,
  channel text,
  audience text,
  tone text,
  cta text,
  occasion text,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magic_up_brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text,
  client_name text,
  logo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_color text,
  secondary_color text,
  tone_of_voice text,
  visual_style text,
  required_words text[] NOT NULL DEFAULT '{}'::text[],
  forbidden_words text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

ALTER TABLE public.magic_up_generations
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.magic_up_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS prompt_text text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS aspect_ratio text,
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS copy_pack jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS export_presets jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.magic_up_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid NOT NULL REFERENCES public.magic_up_generations(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Cliente',
  comment text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magic_up_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid NOT NULL REFERENCES public.magic_up_generations(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (generation_id, reaction_type, ip_hash)
);

CREATE TABLE IF NOT EXISTS public.magic_up_public_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid REFERENCES public.magic_up_generations(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.magic_up_campaigns(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  allow_download boolean NOT NULL DEFAULT true,
  allow_comments boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT magic_up_public_shares_target_check CHECK (generation_id IS NOT NULL OR campaign_id IS NOT NULL)
);

ALTER TABLE public.magic_up_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_up_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_up_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_up_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_up_public_shares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_campaigns' AND policyname = 'Users can view own Magic Up campaigns') THEN
    CREATE POLICY "Users can view own Magic Up campaigns" ON public.magic_up_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_campaigns' AND policyname = 'Users can create own Magic Up campaigns') THEN
    CREATE POLICY "Users can create own Magic Up campaigns" ON public.magic_up_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_campaigns' AND policyname = 'Users can update own Magic Up campaigns') THEN
    CREATE POLICY "Users can update own Magic Up campaigns" ON public.magic_up_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_campaigns' AND policyname = 'Users can delete own Magic Up campaigns') THEN
    CREATE POLICY "Users can delete own Magic Up campaigns" ON public.magic_up_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_brand_kits' AND policyname = 'Users can view own Magic Up brand kits') THEN
    CREATE POLICY "Users can view own Magic Up brand kits" ON public.magic_up_brand_kits FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_brand_kits' AND policyname = 'Users can create own Magic Up brand kits') THEN
    CREATE POLICY "Users can create own Magic Up brand kits" ON public.magic_up_brand_kits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_brand_kits' AND policyname = 'Users can update own Magic Up brand kits') THEN
    CREATE POLICY "Users can update own Magic Up brand kits" ON public.magic_up_brand_kits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_brand_kits' AND policyname = 'Users can delete own Magic Up brand kits') THEN
    CREATE POLICY "Users can delete own Magic Up brand kits" ON public.magic_up_brand_kits FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_comments' AND policyname = 'Users can view comments on own Magic Up generations') THEN
    CREATE POLICY "Users can view comments on own Magic Up generations" ON public.magic_up_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_comments' AND policyname = 'Users can create comments on own Magic Up generations') THEN
    CREATE POLICY "Users can create comments on own Magic Up generations" ON public.magic_up_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.magic_up_generations g WHERE g.id = generation_id AND g.user_id = auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_comments' AND policyname = 'Users can update comments on own Magic Up generations') THEN
    CREATE POLICY "Users can update comments on own Magic Up generations" ON public.magic_up_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_comments' AND policyname = 'Users can delete comments on own Magic Up generations') THEN
    CREATE POLICY "Users can delete comments on own Magic Up generations" ON public.magic_up_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_reactions' AND policyname = 'Users can view reactions on own Magic Up generations') THEN
    CREATE POLICY "Users can view reactions on own Magic Up generations" ON public.magic_up_reactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_reactions' AND policyname = 'Users can create reactions on own Magic Up generations') THEN
    CREATE POLICY "Users can create reactions on own Magic Up generations" ON public.magic_up_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.magic_up_generations g WHERE g.id = generation_id AND g.user_id = auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_reactions' AND policyname = 'Users can update reactions on own Magic Up generations') THEN
    CREATE POLICY "Users can update reactions on own Magic Up generations" ON public.magic_up_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_reactions' AND policyname = 'Users can delete reactions on own Magic Up generations') THEN
    CREATE POLICY "Users can delete reactions on own Magic Up generations" ON public.magic_up_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_public_shares' AND policyname = 'Users can view own Magic Up public shares') THEN
    CREATE POLICY "Users can view own Magic Up public shares" ON public.magic_up_public_shares FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_public_shares' AND policyname = 'Users can create own Magic Up public shares') THEN
    CREATE POLICY "Users can create own Magic Up public shares" ON public.magic_up_public_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_public_shares' AND policyname = 'Users can update own Magic Up public shares') THEN
    CREATE POLICY "Users can update own Magic Up public shares" ON public.magic_up_public_shares FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_public_shares' AND policyname = 'Users can delete own Magic Up public shares') THEN
    CREATE POLICY "Users can delete own Magic Up public shares" ON public.magic_up_public_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_magic_up_campaigns_user_status ON public.magic_up_campaigns(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_brand_kits_user_client ON public.magic_up_brand_kits(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_magic_up_generations_campaign ON public.magic_up_generations(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_generations_user_channel_status ON public.magic_up_generations(user_id, channel, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_generations_tags ON public.magic_up_generations USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_magic_up_comments_generation ON public.magic_up_comments(generation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_reactions_generation ON public.magic_up_reactions(generation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_token ON public.magic_up_public_shares(share_token);

CREATE OR REPLACE FUNCTION public.set_magic_up_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_magic_up_campaigns_updated_at ON public.magic_up_campaigns;
DROP TRIGGER IF EXISTS set_magic_up_campaigns_updated_at ON public.magic_up_campaigns;
CREATE TRIGGER set_magic_up_campaigns_updated_at
BEFORE UPDATE ON public.magic_up_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();

DROP TRIGGER IF EXISTS set_magic_up_brand_kits_updated_at ON public.magic_up_brand_kits;
DROP TRIGGER IF EXISTS set_magic_up_brand_kits_updated_at ON public.magic_up_brand_kits;
CREATE TRIGGER set_magic_up_brand_kits_updated_at
BEFORE UPDATE ON public.magic_up_brand_kits
FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();

DROP TRIGGER IF EXISTS set_magic_up_public_shares_updated_at ON public.magic_up_public_shares;
DROP TRIGGER IF EXISTS set_magic_up_public_shares_updated_at ON public.magic_up_public_shares;
CREATE TRIGGER set_magic_up_public_shares_updated_at
BEFORE UPDATE ON public.magic_up_public_shares
FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();