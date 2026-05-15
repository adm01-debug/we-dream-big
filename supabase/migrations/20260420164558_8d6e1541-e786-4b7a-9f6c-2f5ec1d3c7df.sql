
-- ============================================================
-- USER_COMPARISONS — persistência cross-device + share público
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text,
  client_name text,
  name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_token text UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  share_expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_comparisons_user ON public.user_comparisons(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_comparisons_token ON public.user_comparisons(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_comparisons_public ON public.user_comparisons(is_public, share_expires_at) WHERE is_public = true;

ALTER TABLE public.user_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_comparisons" ON public.user_comparisons;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_comparisons' AND policyname = 'users_select_own_comparisons') THEN
    CREATE POLICY "users_select_own_comparisons" ON public.user_comparisons
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "users_insert_own_comparisons" ON public.user_comparisons;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_comparisons' AND policyname = 'users_insert_own_comparisons') THEN
    CREATE POLICY "users_insert_own_comparisons" ON public.user_comparisons
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "users_update_own_comparisons" ON public.user_comparisons;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_comparisons' AND policyname = 'users_update_own_comparisons') THEN
    CREATE POLICY "users_update_own_comparisons" ON public.user_comparisons
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "users_delete_own_comparisons" ON public.user_comparisons;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_comparisons' AND policyname = 'users_delete_own_comparisons') THEN
    CREATE POLICY "users_delete_own_comparisons" ON public.user_comparisons
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Política pública: anyone pode ler comparações públicas via token (não expiradas)
DROP POLICY IF EXISTS "anyone_read_public_comparisons" ON public.user_comparisons;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_comparisons' AND policyname = 'anyone_read_public_comparisons') THEN
    CREATE POLICY "anyone_read_public_comparisons" ON public.user_comparisons
      FOR SELECT USING (
        is_public = true
        AND share_token IS NOT NULL
        AND (share_expires_at IS NULL OR share_expires_at > now())
      );
  END IF;
END $$;

-- Trigger updated_at (reusa função update_updated_at_column existente)
DROP TRIGGER IF EXISTS trg_user_comparisons_updated_at ON public.user_comparisons;
DROP TRIGGER IF EXISTS trg_user_comparisons_updated_at ON public.user_comparisons;
CREATE TRIGGER trg_user_comparisons_updated_at
  BEFORE UPDATE ON public.user_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COMPARISON_REACTIONS — reações anônimas em comparações públicas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comparison_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id uuid NOT NULL REFERENCES public.user_comparisons(id) ON DELETE CASCADE,
  item_index integer NOT NULL DEFAULT 0,
  emoji text NOT NULL,
  anon_id text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparison_reactions_comp ON public.comparison_reactions(comparison_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comparison_reactions_anon
  ON public.comparison_reactions(comparison_id, item_index, emoji, anon_id);

ALTER TABLE public.comparison_reactions ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer pessoa pode ver reações de comparações públicas)
DROP POLICY IF EXISTS "anyone_read_comparison_reactions" ON public.comparison_reactions;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparison_reactions' AND policyname = 'anyone_read_comparison_reactions') THEN
    CREATE POLICY "anyone_read_comparison_reactions" ON public.comparison_reactions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_comparisons uc
          WHERE uc.id = comparison_reactions.comparison_id
            AND uc.is_public = true
            AND (uc.share_expires_at IS NULL OR uc.share_expires_at > now())
        )
      );
  END IF;
END $$;

-- INSERT só via edge function (service role); negar acesso direto
DROP POLICY IF EXISTS "no_direct_insert_reactions" ON public.comparison_reactions;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparison_reactions' AND policyname = 'no_direct_insert_reactions') THEN
    CREATE POLICY "no_direct_insert_reactions" ON public.comparison_reactions
      FOR INSERT WITH CHECK (false);
  END IF;
END $$;

-- ============================================================
-- PRICE_HISTORY — sparkline 30d de preços
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  variant_id text,
  price numeric(12,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date
  ON public.price_history(product_id, recorded_at DESC);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_price_history" ON public.price_history;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_history' AND policyname = 'anyone_read_price_history') THEN
    CREATE POLICY "anyone_read_price_history" ON public.price_history
      FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================
-- RPC: Limpeza de comparações públicas expiradas
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_public_comparisons()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.user_comparisons
    SET is_public = false,
        share_token = NULL,
        share_expires_at = NULL
    WHERE is_public = true
      AND share_expires_at IS NOT NULL
      AND share_expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- ============================================================
-- RPC: Top produtos mais comparados (últimos 30 dias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_top_compared_products(p_limit integer DEFAULT 6)
RETURNS TABLE(product_id text, comparison_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- RPC: Comparações recentes do usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_recent_comparisons(p_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  name text,
  client_name text,
  items jsonb,
  item_count integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
