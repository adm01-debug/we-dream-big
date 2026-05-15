
-- ============================================
-- KIT VARIANTS (multi-variante P/M/G)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kit_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_master_id UUID NOT NULL REFERENCES public.custom_kits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  box_data JSONB,
  items_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  personalization_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  kit_quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kit_variants_master ON public.kit_variants(kit_master_id);
ALTER TABLE public.kit_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_variants' AND policyname = 'Owner can view variants') THEN
    CREATE POLICY "Owner can view variants"
    ON public.kit_variants FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_variants' AND policyname = 'Owner can insert variants') THEN
    CREATE POLICY "Owner can insert variants"
    ON public.kit_variants FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid())
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_variants' AND policyname = 'Owner can update variants') THEN
    CREATE POLICY "Owner can update variants"
    ON public.kit_variants FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid())
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_variants' AND policyname = 'Owner can delete variants') THEN
    CREATE POLICY "Owner can delete variants"
    ON public.kit_variants FOR DELETE
    USING (
      EXISTS (SELECT 1 FROM public.custom_kits k WHERE k.id = kit_master_id AND k.user_id = auth.uid())
    );
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_kit_variants_updated_at ON public.kit_variants;
CREATE TRIGGER update_kit_variants_updated_at
BEFORE UPDATE ON public.kit_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- KIT COLLABORATORS
-- ============================================
CREATE TABLE IF NOT EXISTS public.kit_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.custom_kits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  invited_by UUID,
  invited_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kit_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_kit_collab_kit ON public.kit_collaborators(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_collab_user ON public.kit_collaborators(user_id);
ALTER TABLE public.kit_collaborators ENABLE ROW LEVEL SECURITY;

-- Helper SECURITY DEFINER to avoid recursion in RLS
CREATE OR REPLACE FUNCTION public.is_kit_collaborator(_kit_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kit_collaborators
    WHERE kit_id = _kit_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_kit_owner(_kit_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_kits WHERE id = _kit_id AND user_id = _user_id
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_collaborators' AND policyname = 'View collaborators if owner or self') THEN
    CREATE POLICY "View collaborators if owner or self"
    ON public.kit_collaborators FOR SELECT
    USING (
      public.is_kit_owner(kit_id, auth.uid())
      OR user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_collaborators' AND policyname = 'Owner can invite collaborators') THEN
    CREATE POLICY "Owner can invite collaborators"
    ON public.kit_collaborators FOR INSERT
    WITH CHECK (public.is_kit_owner(kit_id, auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_collaborators' AND policyname = 'Owner can update collaborators') THEN
    CREATE POLICY "Owner can update collaborators"
    ON public.kit_collaborators FOR UPDATE
    USING (public.is_kit_owner(kit_id, auth.uid()));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_collaborators' AND policyname = 'Owner can remove collaborators') THEN
    CREATE POLICY "Owner can remove collaborators"
    ON public.kit_collaborators FOR DELETE
    USING (public.is_kit_owner(kit_id, auth.uid()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_kit_collab_updated_at ON public.kit_collaborators;
CREATE TRIGGER update_kit_collab_updated_at
BEFORE UPDATE ON public.kit_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- KIT COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.kit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.custom_kits(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  parent_id UUID REFERENCES public.kit_comments(id) ON DELETE CASCADE,
  item_anchor TEXT,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kit_comments_kit ON public.kit_comments(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_comments_parent ON public.kit_comments(parent_id);
ALTER TABLE public.kit_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_comments' AND policyname = 'View comments if owner/collab/admin') THEN
    CREATE POLICY "View comments if owner/collab/admin"
    ON public.kit_comments FOR SELECT
    USING (
      public.is_kit_owner(kit_id, auth.uid())
      OR public.is_kit_collaborator(kit_id, auth.uid())
      OR has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_comments' AND policyname = 'Owner or collab can comment') THEN
    CREATE POLICY "Owner or collab can comment"
    ON public.kit_comments FOR INSERT
    WITH CHECK (
      author_id = auth.uid() AND (
        public.is_kit_owner(kit_id, auth.uid())
        OR public.is_kit_collaborator(kit_id, auth.uid())
      )
    );
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_comments' AND policyname = 'Author can edit own comment') THEN
    CREATE POLICY "Author can edit own comment"
    ON public.kit_comments FOR UPDATE
    USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kit_comments' AND policyname = 'Author can delete own comment') THEN
    CREATE POLICY "Author can delete own comment"
    ON public.kit_comments FOR DELETE
    USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_kit_comments_updated_at ON public.kit_comments;
CREATE TRIGGER update_kit_comments_updated_at
BEFORE UPDATE ON public.kit_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kit_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kit_variants;
