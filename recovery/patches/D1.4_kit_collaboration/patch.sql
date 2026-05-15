-- ═══════════════════════════════════════════════════════════════════
-- PATCH D1.4_kit_collaboration — Kit Collaboration
-- Prioridade: P1
-- Extraído por extract_objects_v3.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.kit_collaborators ───────────
CREATE TABLE IF NOT EXISTS public.kit_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission text DEFAULT 'view'::text NOT NULL,
    invited_by uuid,
    invited_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kit_collaborators_permission_check CHECK ((permission = ANY (ARRAY['view'::text, 'edit'::text])))
);

ALTER TABLE public.kit_collaborators ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_kit_id_user_id_key UNIQUE (kit_id, user_id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.kit_collaborators (2) ───────────
CREATE INDEX IF NOT EXISTS idx_kit_collab_kit ON public.kit_collaborators USING btree (kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_collab_user ON public.kit_collaborators USING btree (user_id);

-- ─────────── POLICIES: public.kit_collaborators (4) ───────────
CREATE POLICY "Owner can invite collaborators" ON public.kit_collaborators FOR INSERT WITH CHECK (public.is_kit_owner(kit_id, auth.uid()));

CREATE POLICY "Owner can remove collaborators" ON public.kit_collaborators FOR DELETE USING (public.is_kit_owner(kit_id, auth.uid()));

CREATE POLICY "Owner can update collaborators" ON public.kit_collaborators FOR UPDATE USING (public.is_kit_owner(kit_id, auth.uid()));

CREATE POLICY "View collaborators if owner or self" ON public.kit_collaborators FOR SELECT USING ((public.is_kit_owner(kit_id, auth.uid()) OR (user_id = auth.uid()) OR public.is_admin(auth.uid())));

-- ─────────── TABLE: public.kit_comments ───────────
CREATE TABLE IF NOT EXISTS public.kit_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    item_anchor text,
    body text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.kit_comments ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.kit_comments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.kit_comments (2) ───────────
CREATE INDEX IF NOT EXISTS idx_kit_comments_kit ON public.kit_comments USING btree (kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_comments_parent ON public.kit_comments USING btree (parent_id);

-- ─────────── POLICIES: public.kit_comments (4) ───────────
CREATE POLICY "Author can delete own comment" ON public.kit_comments FOR DELETE USING (((author_id = auth.uid()) OR public.is_admin(auth.uid())));

CREATE POLICY "Author can edit own comment" ON public.kit_comments FOR UPDATE USING (((author_id = auth.uid()) OR public.is_admin(auth.uid())));

CREATE POLICY "Owner or collab can comment" ON public.kit_comments FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()))));

CREATE POLICY "View comments if owner/collab/admin" ON public.kit_comments FOR SELECT USING ((public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()) OR public.is_admin(auth.uid())));

-- ─────────── TABLE: public.kit_share_tokens ───────────
CREATE TABLE IF NOT EXISTS public.kit_share_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    client_name text,
    client_email text,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.kit_share_tokens ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_token_key UNIQUE (token); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.kit_share_tokens (1) ───────────
CREATE INDEX IF NOT EXISTS idx_kit_share_tokens_kit_id ON public.kit_share_tokens USING btree (kit_id);

-- ─────────── POLICIES: public.kit_share_tokens (1) ───────────
CREATE POLICY "Sellers can manage own kit share tokens" ON public.kit_share_tokens TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));

-- ─────────── TABLE: public.kit_variants ───────────
CREATE TABLE IF NOT EXISTS public.kit_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_master_id uuid NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    box_data jsonb,
    items_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    personalization_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    kit_quantity integer DEFAULT 1 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.kit_variants ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.kit_variants
    ADD CONSTRAINT kit_variants_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.kit_variants
    ADD CONSTRAINT kit_variants_kit_master_id_fkey FOREIGN KEY (kit_master_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.kit_variants (1) ───────────
CREATE INDEX IF NOT EXISTS idx_kit_variants_master ON public.kit_variants USING btree (kit_master_id);

-- ─────────── POLICIES: public.kit_variants (4) ───────────
CREATE POLICY "Owner can delete variants" ON public.kit_variants FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));

CREATE POLICY "Owner can insert variants" ON public.kit_variants FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));

CREATE POLICY "Owner can update variants" ON public.kit_variants FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));

CREATE POLICY "Owner can view variants" ON public.kit_variants FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))) OR public.is_admin(auth.uid())));

-- ─────────── FUNCTION: public.is_kit_collaborator ───────────
CREATE OR REPLACE FUNCTION public.is_kit_collaborator(_kit_id uuid, _user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kit_collaborators
    WHERE kit_id = _kit_id AND user_id = _user_id
  );
$$;

-- ─────────── FUNCTION: public.is_kit_owner ───────────
CREATE OR REPLACE FUNCTION public.is_kit_owner(_kit_id uuid, _user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_kits WHERE id = _kit_id AND user_id = _user_id
  );
$$;

COMMIT;