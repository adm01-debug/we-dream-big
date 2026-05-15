-- ============================================================
-- ONDA A — Favoritos: múltiplas listas + sync + notas + lixeira
-- ============================================================

-- 1) Tabela: favorite_lists
CREATE TABLE IF NOT EXISTS public.favorite_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Minha lista',
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT NOT NULL DEFAULT 'Heart',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  client_id TEXT,
  client_name TEXT,
  shared_token TEXT UNIQUE,
  shared_expires_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_favorite_lists_user ON public.favorite_lists(user_id, position);
CREATE INDEX IF NOT EXISTS idx_favorite_lists_shared_token ON public.favorite_lists(shared_token) WHERE shared_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorite_lists_one_default
  ON public.favorite_lists(user_id) WHERE is_default = true;

ALTER TABLE public.favorite_lists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_lists' AND policyname = 'Users manage own favorite lists') THEN
    CREATE POLICY "Users manage own favorite lists"
      ON public.favorite_lists FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_lists' AND policyname = 'Admins read all favorite lists') THEN
    CREATE POLICY "Admins read all favorite lists"
      ON public.favorite_lists FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_lists' AND policyname = 'Public can read shared lists by token') THEN
    CREATE POLICY "Public can read shared lists by token"
      ON public.favorite_lists FOR SELECT TO anon, authenticated
      USING (
        shared_token IS NOT NULL
        AND (shared_expires_at IS NULL OR shared_expires_at > now())
      );
  END IF;
END $$;

-- 2) Tabela: favorite_items
CREATE TABLE IF NOT EXISTS public.favorite_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.favorite_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  variant_info JSONB,
  note TEXT CHECK (char_length(note) <= 280),
  price_at_save NUMERIC(12,2),
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorite_items_unique
  ON public.favorite_items(list_id, product_id, COALESCE(variant_id, ''));
CREATE INDEX IF NOT EXISTS idx_favorite_items_user ON public.favorite_items(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_items_list ON public.favorite_items(list_id, position);
CREATE INDEX IF NOT EXISTS idx_favorite_items_product ON public.favorite_items(product_id);

ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_items' AND policyname = 'Users manage own favorite items') THEN
    CREATE POLICY "Users manage own favorite items"
      ON public.favorite_items FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_items' AND policyname = 'Admins read all favorite items') THEN
    CREATE POLICY "Admins read all favorite items"
      ON public.favorite_items FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_items' AND policyname = 'Public can read items of shared lists') THEN
    CREATE POLICY "Public can read items of shared lists"
      ON public.favorite_items FOR SELECT TO anon, authenticated
      USING (EXISTS (
        SELECT 1 FROM public.favorite_lists l
        WHERE l.id = favorite_items.list_id
          AND l.shared_token IS NOT NULL
          AND (l.shared_expires_at IS NULL OR l.shared_expires_at > now())
      ));
  END IF;
END $$;

-- 3) Tabela: favorite_items_trash (lixeira TTL 30d)
CREATE TABLE IF NOT EXISTS public.favorite_items_trash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  list_id UUID NOT NULL,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  variant_info JSONB,
  note TEXT,
  price_at_save NUMERIC(12,2),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_favorite_items_trash_user ON public.favorite_items_trash(user_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_items_trash_expires ON public.favorite_items_trash(expires_at);

ALTER TABLE public.favorite_items_trash ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_items_trash' AND policyname = 'Users manage own trash') THEN
    CREATE POLICY "Users manage own trash"
      ON public.favorite_items_trash FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4) Trigger: updated_at
DROP TRIGGER IF EXISTS set_favorite_lists_updated_at ON public.favorite_lists;
CREATE TRIGGER set_favorite_lists_updated_at
  BEFORE UPDATE ON public.favorite_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_favorite_items_updated_at ON public.favorite_items;
CREATE TRIGGER set_favorite_items_updated_at
  BEFORE UPDATE ON public.favorite_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Função: garantir lista padrão por vendedor
CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _list_id UUID;
BEGIN
  SELECT id INTO _list_id
  FROM public.favorite_lists
  WHERE user_id = _user_id AND is_default = true
  LIMIT 1;

  IF _list_id IS NULL THEN
    INSERT INTO public.favorite_lists (user_id, name, icon, color, is_default, position)
    VALUES (_user_id, 'Meus Favoritos', 'Heart', '#EF4444', true, 0)
    RETURNING id INTO _list_id;
  END IF;

  RETURN _list_id;
END;
$$;

-- 6) Trigger: ao deletar item, mover para a lixeira
CREATE OR REPLACE FUNCTION public.move_favorite_to_trash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_favorite_items_to_trash ON public.favorite_items;
CREATE TRIGGER trg_favorite_items_to_trash
  BEFORE DELETE ON public.favorite_items
  FOR EACH ROW EXECUTE FUNCTION public.move_favorite_to_trash();

-- 7) Função: limpar lixeira expirada (chamada via cron futuro)
CREATE OR REPLACE FUNCTION public.cleanup_expired_favorite_trash()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.favorite_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;