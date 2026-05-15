-- P2: Snapshot de preço
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS price_at_save NUMERIC;

-- P3: Campos de CRM e compartilhamento em collections
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_collections_share_token ON public.collections(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collections_client ON public.collections(client_id) WHERE client_id IS NOT NULL;

-- Política: leitura pública via token válido
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'Public can view collection by valid share token') THEN
    CREATE POLICY "Public can view collection by valid share token"
      ON public.collections FOR SELECT
      USING (
        is_public = true
        AND share_token IS NOT NULL
        AND (share_expires_at IS NULL OR share_expires_at > now())
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'Public can view items of public collections') THEN
    CREATE POLICY "Public can view items of public collections"
      ON public.collection_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.collections c
          WHERE c.id = collection_items.collection_id
            AND c.is_public = true
            AND c.share_token IS NOT NULL
            AND (c.share_expires_at IS NULL OR c.share_expires_at > now())
        )
      );
  END IF;
END $$;

-- Tabela de reações anônimas
CREATE TABLE IF NOT EXISTS public.collection_item_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL,
  item_id UUID NOT NULL,
  anon_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_reactions_collection ON public.collection_item_reactions(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_reactions_item ON public.collection_item_reactions(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_reactions_anon ON public.collection_item_reactions(item_id, anon_id, emoji);

ALTER TABLE public.collection_item_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_item_reactions' AND policyname = 'Public can view reactions for public collections') THEN
    CREATE POLICY "Public can view reactions for public collections"
      ON public.collection_item_reactions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.collections c
          WHERE c.id = collection_item_reactions.collection_id
            AND c.is_public = true
            AND c.share_token IS NOT NULL
            AND (c.share_expires_at IS NULL OR c.share_expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM public.collections c
          WHERE c.id = collection_item_reactions.collection_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Insert via edge function (service role)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_item_reactions' AND policyname = 'Service role inserts reactions') THEN
    CREATE POLICY "Service role inserts reactions"
      ON public.collection_item_reactions FOR INSERT
      WITH CHECK (false);
  END IF;
END $$;

-- RPCs P4
CREATE OR REPLACE FUNCTION public.get_top_collected_products(_days integer DEFAULT 7, _limit integer DEFAULT 6)
RETURNS TABLE(product_id text, col_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_collections_weekly_count(_weeks integer DEFAULT 8)
RETURNS TABLE(week_start date, item_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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