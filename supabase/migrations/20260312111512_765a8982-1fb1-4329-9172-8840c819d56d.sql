
-- Fix RLS policies: change from 'public' role to 'authenticated' role

-- 1. expert_conversations
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.expert_conversations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_conversations' AND policyname = 'Users can manage own conversations') THEN
    CREATE POLICY "Users can manage own conversations"
      ON public.expert_conversations
      FOR ALL
      TO authenticated
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

-- 2. expert_messages
DROP POLICY IF EXISTS "Users can manage own messages" ON public.expert_messages;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_messages' AND policyname = 'Users can manage own messages') THEN
    CREATE POLICY "Users can manage own messages"
      ON public.expert_messages
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.expert_conversations
        WHERE id = expert_messages.conversation_id
        AND seller_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.expert_conversations
        WHERE id = expert_messages.conversation_id
        AND seller_id = auth.uid()
      ));
  END IF;
END $$;

-- 3. mockup_drafts
DROP POLICY IF EXISTS "Users can manage own drafts" ON public.mockup_drafts;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_drafts' AND policyname = 'Users can manage own drafts') THEN
    CREATE POLICY "Users can manage own drafts"
      ON public.mockup_drafts
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. magic_up_generations
DROP POLICY IF EXISTS "Users can manage own generations" ON public.magic_up_generations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_up_generations' AND policyname = 'Users can manage own generations') THEN
    CREATE POLICY "Users can manage own generations"
      ON public.magic_up_generations
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 5. user_onboarding - fix all three policies
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.user_onboarding;
DROP POLICY IF EXISTS "Users can insert own onboarding" ON public.user_onboarding;
DROP POLICY IF EXISTS "Users can update own onboarding" ON public.user_onboarding;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can view own onboarding') THEN
    CREATE POLICY "Users can view own onboarding"
      ON public.user_onboarding FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can insert own onboarding') THEN
    CREATE POLICY "Users can insert own onboarding"
      ON public.user_onboarding FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_onboarding' AND policyname = 'Users can update own onboarding') THEN
    CREATE POLICY "Users can update own onboarding"
      ON public.user_onboarding FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
