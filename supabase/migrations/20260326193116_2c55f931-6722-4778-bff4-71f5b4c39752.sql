
-- Fix prevent_role_self_update to allow trigger/migration context
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop duplicate trigger (prevent_profile_role_change and prevent_profile_role_change_trigger are duplicates)
DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;

-- Fix prevent_profile_role_change to allow trigger/migration context  
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change the role field on profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Now run the one-time sync
UPDATE public.profiles p
SET role = ur.role::text,
    updated_at = now()
FROM public.user_roles ur
WHERE p.user_id = ur.user_id
  AND (p.role IS DISTINCT FROM ur.role::text);
