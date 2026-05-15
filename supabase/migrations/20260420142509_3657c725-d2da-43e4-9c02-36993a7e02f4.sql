-- Tabela de lixeira para itens de coleção
CREATE TABLE IF NOT EXISTS public.collection_items_trash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  color_name TEXT,
  color_hex TEXT,
  thumbnail_url TEXT,
  notes TEXT,
  price_at_save NUMERIC,
  sort_order INTEGER,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_collection_trash_user ON public.collection_items_trash(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_trash_expires ON public.collection_items_trash(expires_at);
CREATE INDEX IF NOT EXISTS idx_collection_trash_collection ON public.collection_items_trash(collection_id);

ALTER TABLE public.collection_items_trash ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items_trash' AND policyname = 'Users view own collection trash') THEN
    CREATE POLICY "Users view own collection trash"
      ON public.collection_items_trash FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items_trash' AND policyname = 'Users insert own collection trash') THEN
    CREATE POLICY "Users insert own collection trash"
      ON public.collection_items_trash FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items_trash' AND policyname = 'Users delete own collection trash') THEN
    CREATE POLICY "Users delete own collection trash"
      ON public.collection_items_trash FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger: ao remover item, mover para lixeira
CREATE OR REPLACE FUNCTION public.move_collection_item_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_move_collection_item_to_trash ON public.collection_items;
DROP TRIGGER IF EXISTS trg_move_collection_item_to_trash ON public.collection_items;
CREATE TRIGGER trg_move_collection_item_to_trash
  BEFORE DELETE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.move_collection_item_to_trash();

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_expired_collection_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.collection_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;