-- ============================================================
-- FIX: Garantir user_id em profiles + corrigir RLS policies
-- Resolve schema drift: migrações 20250103* criam profiles sem
-- user_id; este arquivo garante consistência idempotente tanto
-- no preview branch quanto em produção.
-- ============================================================

-- 1. Garantir que user_id existe em profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN NULL;
    END;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Fix profiles user_id skipped: %', SQLERRM;
END $$;

-- 2. Corrigir policies usando SQL dinâmico (compatível com ambos os schemas)
DO $$
DECLARE
  v_auth_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    v_auth_col := 'user_id';
  ELSE
    v_auth_col := 'id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view their own profile') THEN
    EXECUTE format('CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = %I)', v_auth_col);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile') THEN
    EXECUTE format('CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = %I)', v_auth_col);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert their own profile') THEN
    EXECUTE format('CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = %I)', v_auth_col);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Fix profiles RLS policies skipped: %', SQLERRM;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
