-- Remover índices duplicados (cobertos por PK, UNIQUE ou outro índice idêntico)
DROP INDEX IF EXISTS public.idx_ai_usage_user_created;
DROP INDEX IF EXISTS public.idx_orders_org_id;
DROP INDEX IF EXISTS public.idx_organizations_slug;
DROP INDEX IF EXISTS public.idx_profiles_user_id;
DROP INDEX IF EXISTS public.idx_approval_tokens_token;
DROP INDEX IF EXISTS public.idx_quotes_org_id;
DROP INDEX IF EXISTS public.idx_seller_discount_limits_user_id;