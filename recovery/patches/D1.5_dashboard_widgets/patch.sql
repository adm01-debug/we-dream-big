-- ═══════════════════════════════════════════════════════════════════
-- PATCH D1.5_dashboard_widgets — Dashboard Widgets RPCs + user_comparisons
-- Prioridade: P1
-- Extraído por extract_objects_v3.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.user_comparisons ───────────
CREATE TABLE IF NOT EXISTS public.user_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    name text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    share_token text,
    is_public boolean DEFAULT false NOT NULL,
    share_expires_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_comparisons ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_share_token_key UNIQUE (share_token); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.user_comparisons (3) ───────────
CREATE INDEX IF NOT EXISTS idx_user_comparisons_public ON public.user_comparisons USING btree (is_public, share_expires_at) WHERE (is_public = true);
CREATE INDEX IF NOT EXISTS idx_user_comparisons_token ON public.user_comparisons USING btree (share_token) WHERE (share_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_user_comparisons_user ON public.user_comparisons USING btree (user_id, updated_at DESC);

-- ─────────── POLICIES: public.user_comparisons (5) ───────────
DROP POLICY IF EXISTS anyone_read_public_comparisons ON public.user_comparisons;
CREATE POLICY anyone_read_public_comparisons ON public.user_comparisons FOR SELECT USING (((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))));

DROP POLICY IF EXISTS users_delete_own_comparisons ON public.user_comparisons;
CREATE POLICY users_delete_own_comparisons ON public.user_comparisons FOR DELETE USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS users_insert_own_comparisons ON public.user_comparisons;
CREATE POLICY users_insert_own_comparisons ON public.user_comparisons FOR INSERT WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS users_select_own_comparisons ON public.user_comparisons;
CREATE POLICY users_select_own_comparisons ON public.user_comparisons FOR SELECT USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS users_update_own_comparisons ON public.user_comparisons;
CREATE POLICY users_update_own_comparisons ON public.user_comparisons FOR UPDATE USING ((auth.uid() = user_id));


--

-- ─────────── FUNCTION: public.get_top_collected_products ───────────
CREATE OR REPLACE FUNCTION public.get_top_collected_products(_days integer DEFAULT 7, _limit integer DEFAULT 6) RETURNS TABLE(product_id text, col_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    ci.product_id,
    COUNT(*)::bigint AS col_count
  FROM public.collection_items ci
  WHERE ci.created_at >= (now() - make_interval(days => GREATEST(_days, 1)))
  GROUP BY ci.product_id
  ORDER BY col_count DESC, MAX(ci.created_at) DESC
  LIMIT GREATEST(_limit, 1);
$$;

-- ─────────── FUNCTION: public.get_top_compared_products ───────────
CREATE OR REPLACE FUNCTION public.get_top_compared_products(p_limit integer DEFAULT 6) RETURNS TABLE(product_id text, comparison_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    (item->>'productId')::text AS product_id,
    count(*)::bigint AS comparison_count
  FROM public.user_comparisons,
       jsonb_array_elements(items) AS item
  WHERE updated_at > now() - interval '30 days'
  GROUP BY (item->>'productId')
  ORDER BY comparison_count DESC
  LIMIT p_limit;
$$;

-- ─────────── FUNCTION: public.get_top_favorited_products ───────────
CREATE OR REPLACE FUNCTION public.get_top_favorited_products(_days integer DEFAULT 7, _limit integer DEFAULT 6) RETURNS TABLE(product_id text, fav_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    fi.product_id,
    COUNT(*)::bigint AS fav_count
  FROM public.favorite_items fi
  WHERE fi.added_at >= (now() - make_interval(days => GREATEST(_days, 1)))
  GROUP BY fi.product_id
  ORDER BY fav_count DESC, MAX(fi.added_at) DESC
  LIMIT GREATEST(_limit, 1);
$$;

-- ─────────── FUNCTION: public.get_collections_weekly_count ───────────
CREATE OR REPLACE FUNCTION public.get_collections_weekly_count(_weeks integer DEFAULT 8) RETURNS TABLE(week_start date, item_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now())::date - (GREATEST(_weeks, 1) - 1) * 7,
      date_trunc('week', now())::date,
      '7 days'::interval
    )::date AS week_start
  )
  SELECT
    w.week_start,
    COALESCE(COUNT(ci.id), 0)::bigint AS item_count
  FROM weeks w
  LEFT JOIN public.collection_items ci
    ON date_trunc('week', ci.created_at)::date = w.week_start
    AND EXISTS (SELECT 1 FROM public.collections c WHERE c.id = ci.collection_id AND c.user_id = auth.uid())
  GROUP BY w.week_start
  ORDER BY w.week_start ASC;
$$;

-- ─────────── FUNCTION: public.get_favorites_weekly_count ───────────
CREATE OR REPLACE FUNCTION public.get_favorites_weekly_count(_weeks integer DEFAULT 8) RETURNS TABLE(week_start date, item_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now())::date - (GREATEST(_weeks, 1) - 1) * 7,
      date_trunc('week', now())::date,
      '7 days'::interval
    )::date AS week_start
  )
  SELECT
    w.week_start,
    COALESCE(COUNT(fi.id), 0)::bigint AS item_count
  FROM weeks w
  LEFT JOIN public.favorite_items fi
    ON fi.user_id = auth.uid()
    AND date_trunc('week', fi.added_at)::date = w.week_start
  GROUP BY w.week_start
  ORDER BY w.week_start ASC;
$$;

-- ─────────── FUNCTION: public.get_user_recent_comparisons ───────────
CREATE OR REPLACE FUNCTION public.get_user_recent_comparisons(p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, name text, client_name text, items jsonb, item_count integer, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    uc.id,
    uc.name,
    uc.client_name,
    uc.items,
    jsonb_array_length(uc.items) AS item_count,
    uc.updated_at
  FROM public.user_comparisons uc
  WHERE uc.user_id = auth.uid()
  ORDER BY uc.updated_at DESC
  LIMIT p_limit;
$$;

COMMIT;