-- ═══════════════════════════════════════════════════════════════════
-- PATCH D1.3_collection_items — Collection Items v2
-- Prioridade: P1
-- Extraído por extract_objects_v3.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.collection_items ───────────
CREATE TABLE IF NOT EXISTS public.collection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    product_id text NOT NULL,
    color_name text,
    color_hex text,
    thumbnail_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    price_at_save numeric,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_collection_id_product_id_color_name_key UNIQUE (collection_id, product_id, color_name); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.collection_items (2) ───────────
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON public.collection_items USING btree (collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items USING btree (collection_id);

-- ─────────── POLICIES: public.collection_items (2) ───────────
CREATE POLICY "Public can view items of public collections" ON public.collection_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))));

CREATE POLICY "Users can manage own collection items" ON public.collection_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = auth.uid())))));

-- ─────────── TABLE: public.collection_items_trash ───────────
CREATE TABLE IF NOT EXISTS public.collection_items_trash (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    color_name text,
    color_hex text,
    thumbnail_url text,
    notes text,
    price_at_save numeric,
    sort_order integer,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);

ALTER TABLE public.collection_items_trash ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.collection_items_trash
    ADD CONSTRAINT collection_items_trash_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.collection_items_trash (3) ───────────
CREATE INDEX IF NOT EXISTS idx_collection_trash_collection ON public.collection_items_trash USING btree (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_trash_expires ON public.collection_items_trash USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_collection_trash_user ON public.collection_items_trash USING btree (user_id);

-- ─────────── POLICIES: public.collection_items_trash (3) ───────────
CREATE POLICY "Users delete own collection trash" ON public.collection_items_trash FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Users insert own collection trash" ON public.collection_items_trash FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users view own collection trash" ON public.collection_items_trash FOR SELECT USING ((auth.uid() = user_id));

-- ─────────── FUNCTION: public.move_collection_item_to_trash ───────────
CREATE OR REPLACE FUNCTION public.move_collection_item_to_trash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT user_id INTO _user_id FROM public.collections WHERE id = OLD.collection_id;
  IF _user_id IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.collection_items_trash (
    original_id, collection_id, user_id, product_id,
    color_name, color_hex, thumbnail_url, notes, sort_order
  ) VALUES (
    OLD.id, OLD.collection_id, _user_id, OLD.product_id,
    OLD.color_name, OLD.color_hex, OLD.thumbnail_url, OLD.notes, OLD.sort_order
  );
  RETURN OLD;
END;
$$;

-- ─────────── FUNCTION: public.cleanup_expired_collection_trash ───────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_collection_trash() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.collection_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

COMMIT;