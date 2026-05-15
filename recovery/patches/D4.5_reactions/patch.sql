-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.5 Reactions (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: collection_item_reactions ───
--

CREATE TABLE public.collection_item_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    item_id uuid NOT NULL,
    anon_id text NOT NULL,
    emoji text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_collection_reactions_collection ON public.collection_item_reactions USING btree (collection_id);


--
--

CREATE INDEX idx_collection_reactions_item ON public.collection_item_reactions USING btree (item_id);


--
--

CREATE UNIQUE INDEX uq_collection_reactions_anon ON public.collection_item_reactions USING btree (item_id, anon_id, emoji);


--

--

ALTER TABLE public.collection_item_reactions ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Public can view reactions for public collections" ON public.collection_item_reactions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))) OR (EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.user_id = auth.uid()))))));


--
--

CREATE POLICY "Service role inserts reactions" ON public.collection_item_reactions FOR INSERT WITH CHECK (false);


--

-- ─── Table: favorite_item_reactions ───
--

CREATE TABLE public.favorite_item_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    list_id uuid NOT NULL,
    anon_id text NOT NULL,
    emoji text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorite_item_reactions_emoji_check CHECK ((emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🔥'::text, '💡'::text])))
);


--

--

CREATE INDEX idx_favorite_reactions_created ON public.favorite_item_reactions USING btree (created_at DESC);


--
--

CREATE INDEX idx_favorite_reactions_item ON public.favorite_item_reactions USING btree (item_id);


--
--

CREATE INDEX idx_favorite_reactions_list ON public.favorite_item_reactions USING btree (list_id);


--

--

ALTER TABLE public.favorite_item_reactions ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins read all reactions" ON public.favorite_item_reactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
--

CREATE POLICY "Owners delete own list reactions" ON public.favorite_item_reactions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = auth.uid())))));


--
--

CREATE POLICY "Owners read own list reactions" ON public.favorite_item_reactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = auth.uid())))));


--
--

CREATE POLICY "Public can insert reactions on shared lists" ON public.favorite_item_reactions FOR INSERT TO authenticated, anon WITH CHECK ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))));


--
--

CREATE POLICY "Public can read reactions of shared lists" ON public.favorite_item_reactions FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))));


--

-- ─── Table: comparison_reactions ───
--

CREATE TABLE public.comparison_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    item_index integer DEFAULT 0 NOT NULL,
    emoji text NOT NULL,
    anon_id text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_comparison_reactions_comp ON public.comparison_reactions USING btree (comparison_id, created_at DESC);


--
--

CREATE UNIQUE INDEX uq_comparison_reactions_anon ON public.comparison_reactions USING btree (comparison_id, item_index, emoji, anon_id);


--

--

ALTER TABLE public.comparison_reactions ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY anyone_read_comparison_reactions ON public.comparison_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_comparisons uc
  WHERE ((uc.id = comparison_reactions.comparison_id) AND (uc.is_public = true) AND ((uc.share_expires_at IS NULL) OR (uc.share_expires_at > now()))))));


--
--

CREATE POLICY no_direct_insert_reactions ON public.comparison_reactions FOR INSERT WITH CHECK (false);


--

COMMIT;
