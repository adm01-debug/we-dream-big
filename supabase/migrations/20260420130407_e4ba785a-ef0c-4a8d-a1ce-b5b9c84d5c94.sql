-- ===========================================================
-- Onda C4 + D4 + D5: Reactions públicas + RPCs de inteligência
-- ===========================================================

-- ============ Tabela favorite_item_reactions ============
CREATE TABLE IF NOT EXISTS public.favorite_item_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.favorite_items(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.favorite_lists(id) ON DELETE CASCADE,
  anon_id text NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '🔥', '💡')),
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, anon_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_favorite_reactions_item ON public.favorite_item_reactions(item_id);
CREATE INDEX IF NOT EXISTS idx_favorite_reactions_list ON public.favorite_item_reactions(list_id);
CREATE INDEX IF NOT EXISTS idx_favorite_reactions_created ON public.favorite_item_reactions(created_at DESC);

ALTER TABLE public.favorite_item_reactions ENABLE ROW LEVEL SECURITY;

-- Pública (anon + auth): leitura/insert SE a lista pai está compartilhada por token válido
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_item_reactions' AND policyname = 'Public can read reactions of shared lists') THEN
    CREATE POLICY "Public can read reactions of shared lists"
      ON public.favorite_item_reactions
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.favorite_lists l
          WHERE l.id = favorite_item_reactions.list_id
            AND l.shared_token IS NOT NULL
            AND (l.shared_expires_at IS NULL OR l.shared_expires_at > now())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_item_reactions' AND policyname = 'Public can insert reactions on shared lists') THEN
    CREATE POLICY "Public can insert reactions on shared lists"
      ON public.favorite_item_reactions
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.favorite_lists l
          WHERE l.id = favorite_item_reactions.list_id
            AND l.shared_token IS NOT NULL
            AND (l.shared_expires_at IS NULL OR l.shared_expires_at > now())
        )
      );
  END IF;
END $$;

-- Dono da lista pode ver todas as reactions de suas listas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_item_reactions' AND policyname = 'Owners read own list reactions') THEN
    CREATE POLICY "Owners read own list reactions"
      ON public.favorite_item_reactions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.favorite_lists l
          WHERE l.id = favorite_item_reactions.list_id
            AND l.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Dono pode deletar reactions (moderação)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_item_reactions' AND policyname = 'Owners delete own list reactions') THEN
    CREATE POLICY "Owners delete own list reactions"
      ON public.favorite_item_reactions
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.favorite_lists l
          WHERE l.id = favorite_item_reactions.list_id
            AND l.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin total
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_item_reactions' AND policyname = 'Admins read all reactions') THEN
    CREATE POLICY "Admins read all reactions"
      ON public.favorite_item_reactions
      FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- ============ RPC: top favoritados (Onda D4) ============
CREATE OR REPLACE FUNCTION public.get_top_favorited_products(_days int DEFAULT 7, _limit int DEFAULT 6)
RETURNS TABLE (product_id text, fav_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.get_top_favorited_products(int, int) TO authenticated;

-- ============ RPC: contagem semanal (Onda D5) ============
CREATE OR REPLACE FUNCTION public.get_favorites_weekly_count(_weeks int DEFAULT 8)
RETURNS TABLE (week_start date, item_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    COALESCE(COUNT(fi.id), 0)::bigint AS item_count
  FROM weeks w
  LEFT JOIN public.favorite_items fi
    ON fi.user_id = auth.uid()
    AND date_trunc('week', fi.added_at)::date = w.week_start
  GROUP BY w.week_start
  ORDER BY w.week_start ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_favorites_weekly_count(int) TO authenticated;