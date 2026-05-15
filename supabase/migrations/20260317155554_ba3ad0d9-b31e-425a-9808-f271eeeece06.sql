
-- ==============================================
-- FIX #2: Prevent privilege escalation via profiles.role
-- Replace permissive UPDATE policy with one that blocks role changes
-- ==============================================

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy: users can update own profile but NOT the role column
-- We use a trigger to enforce this since RLS cannot restrict individual columns
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the role column is being changed and the user is NOT an admin, block it
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change the role field on profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS prevent_profile_role_change_trigger ON public.profiles;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_profile_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_change();

-- Recreate the UPDATE policy (same as before, trigger handles column protection)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ==============================================
-- FIX #4: Restrict query_telemetry INSERT
-- Replace permissive WITH CHECK (true) with user_id check
-- ==============================================

DROP POLICY IF EXISTS "Service can insert telemetry" ON public.query_telemetry;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_telemetry' AND policyname = 'Authenticated users can insert own telemetry') THEN
    CREATE POLICY "Authenticated users can insert own telemetry"
      ON public.query_telemetry
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
