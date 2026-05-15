-- T34b: Set v_category_keywords and v_product_tokens to SECURITY INVOKER
-- Views recreated in T34 defaulted to SECURITY DEFINER (pre-PG15 default);
-- setting security_invoker=true ensures RLS is enforced for the querying user.
-- Fixes: security_definer_view advisor violation (2 issues)
DO $$ BEGIN
  ALTER VIEW public.v_category_keywords SET (security_invoker = true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER VIEW public.v_product_tokens SET (security_invoker = true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
