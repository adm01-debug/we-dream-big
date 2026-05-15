-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.3.1 Magic Up (P3)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: magic_up_brand_kits ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_brand_kits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    logo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    primary_color text,
    secondary_color text,
    tone_of_voice text,
    visual_style text,
    required_words text[] DEFAULT '{}'::text[] NOT NULL,
    forbidden_words text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_brand_kits_user_client ON public.magic_up_brand_kits USING btree (user_id, client_id);


--

--

ALTER TABLE public.magic_up_brand_kits ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create own Magic Up brand kits" ON public.magic_up_brand_kits FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can delete own Magic Up brand kits" ON public.magic_up_brand_kits FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update own Magic Up brand kits" ON public.magic_up_brand_kits FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view own Magic Up brand kits" ON public.magic_up_brand_kits FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER set_magic_up_brand_kits_updated_at BEFORE UPDATE ON public.magic_up_brand_kits FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
--

CREATE TRIGGER trg_owner__magic_up_brand_kits__user_id BEFORE INSERT ON public.magic_up_brand_kits FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: magic_up_campaigns ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    title text DEFAULT 'Campanha Magic Up'::text NOT NULL,
    objective text,
    channel text,
    audience text,
    tone text,
    cta text,
    occasion text,
    status text DEFAULT 'draft'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_campaigns_user_status ON public.magic_up_campaigns USING btree (user_id, status, created_at DESC);


--

--

ALTER TABLE public.magic_up_campaigns ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create own Magic Up campaigns" ON public.magic_up_campaigns FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can delete own Magic Up campaigns" ON public.magic_up_campaigns FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update own Magic Up campaigns" ON public.magic_up_campaigns FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view own Magic Up campaigns" ON public.magic_up_campaigns FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER set_magic_up_campaigns_updated_at BEFORE UPDATE ON public.magic_up_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
--

CREATE TRIGGER trg_owner__magic_up_campaigns__user_id BEFORE INSERT ON public.magic_up_campaigns FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: magic_up_comments ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid NOT NULL,
    author_name text DEFAULT 'Cliente'::text NOT NULL,
    comment text NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_comments_generation ON public.magic_up_comments USING btree (generation_id, created_at DESC);


--

--

ALTER TABLE public.magic_up_comments ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create comments on own Magic Up generations" ON public.magic_up_comments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.magic_up_generations g
  WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = auth.uid()))))));


--
--

CREATE POLICY "Users can delete comments on own Magic Up generations" ON public.magic_up_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update comments on own Magic Up generations" ON public.magic_up_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view comments on own Magic Up generations" ON public.magic_up_comments FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER trg_owner__magic_up_comments__user_id BEFORE INSERT ON public.magic_up_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: magic_up_generations ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_name text,
    scene_title text,
    scene_category text,
    client_name text,
    generated_image_url text,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id uuid,
    product_id text,
    product_sku text,
    prompt_text text,
    model text,
    channel text,
    aspect_ratio text,
    quality_score integer,
    status text DEFAULT 'draft'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    copy_pack jsonb DEFAULT '{}'::jsonb NOT NULL,
    export_presets jsonb DEFAULT '[]'::jsonb NOT NULL
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_generations_campaign ON public.magic_up_generations USING btree (campaign_id, created_at DESC);


--
--

CREATE INDEX IF NOT EXISTS idx_magic_up_generations_tags ON public.magic_up_generations USING gin (tags);


--
--

CREATE INDEX IF NOT EXISTS idx_magic_up_generations_user_channel_status ON public.magic_up_generations USING btree (user_id, channel, status, created_at DESC);


--
--

CREATE INDEX IF NOT EXISTS idx_magic_up_generations_user_id ON public.magic_up_generations USING btree (user_id);


--

--

ALTER TABLE public.magic_up_generations ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own generations" ON public.magic_up_generations TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__magic_up_generations__user_id BEFORE INSERT ON public.magic_up_generations FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: magic_up_public_shares ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_public_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid,
    campaign_id uuid,
    share_token text DEFAULT encode(extensions.gen_random_bytes(24), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone,
    allow_download boolean DEFAULT true NOT NULL,
    allow_comments boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT magic_up_public_shares_target_check CHECK (((generation_id IS NOT NULL) OR (campaign_id IS NOT NULL)))
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_campaign_id ON public.magic_up_public_shares USING btree (campaign_id);


--
--

CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_generation_id ON public.magic_up_public_shares USING btree (generation_id);


--
--

CREATE INDEX IF NOT EXISTS idx_magic_up_public_shares_token ON public.magic_up_public_shares USING btree (share_token);


--

--

ALTER TABLE public.magic_up_public_shares ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create own Magic Up public shares" ON public.magic_up_public_shares FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can delete own Magic Up public shares" ON public.magic_up_public_shares FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update own Magic Up public shares" ON public.magic_up_public_shares FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view own Magic Up public shares" ON public.magic_up_public_shares FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER set_magic_up_public_shares_updated_at BEFORE UPDATE ON public.magic_up_public_shares FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
--

CREATE TRIGGER trg_owner__magic_up_public_shares__user_id BEFORE INSERT ON public.magic_up_public_shares FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: magic_up_reactions ───
--

CREATE TABLE IF NOT EXISTS public.magic_up_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid NOT NULL,
    reaction_type text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX IF NOT EXISTS idx_magic_up_reactions_generation ON public.magic_up_reactions USING btree (generation_id, created_at DESC);


--

--

ALTER TABLE public.magic_up_reactions ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create reactions on own Magic Up generations" ON public.magic_up_reactions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.magic_up_generations g
  WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = auth.uid()))))));


--
--

CREATE POLICY "Users can delete reactions on own Magic Up generations" ON public.magic_up_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update reactions on own Magic Up generations" ON public.magic_up_reactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view reactions on own Magic Up generations" ON public.magic_up_reactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER trg_owner__magic_up_reactions__user_id BEFORE INSERT ON public.magic_up_reactions FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.3.1 Magic Up (P3)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

COMMIT;
