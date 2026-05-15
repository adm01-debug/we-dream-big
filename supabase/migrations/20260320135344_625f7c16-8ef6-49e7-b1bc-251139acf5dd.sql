
-- P0 #1: Fix quote_approval_tokens RLS - drop ALL policy and create explicit granular policies
DROP POLICY IF EXISTS "Users can manage own approval tokens" ON public.quote_approval_tokens;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Sellers can select own tokens') THEN
    CREATE POLICY "Sellers can select own tokens"
    ON public.quote_approval_tokens
    FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Sellers can insert own tokens') THEN
    CREATE POLICY "Sellers can insert own tokens"
    ON public.quote_approval_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Sellers can update own tokens') THEN
    CREATE POLICY "Sellers can update own tokens"
    ON public.quote_approval_tokens
    FOR UPDATE
    TO authenticated
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Sellers can delete own tokens') THEN
    CREATE POLICY "Sellers can delete own tokens"
    ON public.quote_approval_tokens
    FOR DELETE
    TO authenticated
    USING (seller_id = auth.uid());
  END IF;
END $$;

-- P1 #9: Fix organization_members - consolidate INSERT policies to prevent confusion
DROP POLICY IF EXISTS "Org admins can insert members only" ON public.organization_members;
-- Keep only the owner policy which is more permissive and correct
