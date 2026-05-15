-- Revoke access to sensitive functions
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_optimization_queue(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
