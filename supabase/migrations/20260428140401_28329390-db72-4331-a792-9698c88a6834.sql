-- Restaurar EXECUTE para authenticated nas RPCs usadas por RLS de quotes/user_roles/organization_members.
-- Estas funções são SECURITY DEFINER e seguras para authenticated (filtram por _user_id e são read-only).
GRANT EXECUTE ON FUNCTION public.get_user_org_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) TO authenticated;