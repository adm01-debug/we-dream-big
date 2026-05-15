-- ============================================================
-- Triggers de propriedade reforçados
-- ============================================================

CREATE OR REPLACE FUNCTION public._can_act_on_behalf_of_others()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR public.has_role(auth.uid(), 'dev'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.enforce_seller_id_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.seller_id IS NULL THEN
    NEW.seller_id := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.seller_id <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: seller_id (%) difere do usuário autenticado (%).',
      NEW.seller_id, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_seller_id_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_user_id_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.user_id <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: user_id (%) difere do usuário autenticado (%).',
      NEW.user_id, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_user_id_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_created_by_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.created_by <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: created_by (%) difere do usuário autenticado (%).',
      NEW.created_by, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_created_by_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.set_seller_id_default() CASCADE;

DO $$
DECLARE
  trg  text;
  func text;
  col_tables text[][] := ARRAY[
    ARRAY['quotes','seller_id'],
    ARRAY['orders','seller_id'],
    ARRAY['discount_approval_requests','seller_id'],
    ARRAY['quote_templates','seller_id'],
    ARRAY['quote_approval_tokens','seller_id'],
    ARRAY['follow_up_reminders','seller_id'],
    ARRAY['generated_mockups','seller_id'],
    ARRAY['kit_share_tokens','seller_id'],
    ARRAY['seller_carts','seller_id'],
    ARRAY['expert_conversations','seller_id'],
    ARRAY['quote_comments','user_id'],
    ARRAY['art_file_attachments','user_id'],
    ARRAY['cart_templates','user_id'],
    ARRAY['collections','user_id'],
    ARRAY['custom_kits','user_id'],
    ARRAY['favorite_lists','user_id'],
    ARRAY['favorite_items','user_id'],
    ARRAY['mockup_drafts','user_id'],
    ARRAY['mockup_templates','user_id'],
    ARRAY['saved_filters','user_id'],
    ARRAY['saved_trends_views','user_id'],
    ARRAY['scheduled_reports','user_id'],
    ARRAY['ai_insights_cache','user_id'],
    ARRAY['magic_up_brand_kits','user_id'],
    ARRAY['magic_up_campaigns','user_id'],
    ARRAY['magic_up_generations','user_id'],
    ARRAY['magic_up_comments','user_id'],
    ARRAY['magic_up_public_shares','user_id'],
    ARRAY['magic_up_reactions','user_id'],
    ARRAY['external_connections','created_by'],
    ARRAY['outbound_webhooks','created_by'],
    ARRAY['inbound_webhook_endpoints','created_by'],
    ARRAY['mcp_api_keys','created_by']
  ];
  i int;
  tbl text;
  col text;
BEGIN
  FOR i IN 1 .. array_length(col_tables, 1) LOOP
    tbl := col_tables[i][1];
    col := col_tables[i][2];

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tbl
    ) THEN CONTINUE; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name=col
    ) THEN CONTINUE; END IF;

    func := CASE col
      WHEN 'seller_id'  THEN 'public.enforce_seller_id_owner'
      WHEN 'user_id'    THEN 'public.enforce_user_id_owner'
      WHEN 'created_by' THEN 'public.enforce_created_by_owner'
    END;

    trg := format('trg_owner__%s__%s', tbl, col);

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trg, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION %s()',
      trg, tbl, func
    );
  END LOOP;
END $$;

COMMENT ON FUNCTION public.enforce_seller_id_owner() IS
  'BEFORE INSERT trigger: auto-preenche seller_id com auth.uid() quando NULL e bloqueia spoofing por usuários sem privilégio elevado.';
COMMENT ON FUNCTION public.enforce_user_id_owner() IS
  'BEFORE INSERT trigger: auto-preenche user_id com auth.uid() quando NULL e bloqueia spoofing por usuários sem privilégio elevado.';
COMMENT ON FUNCTION public.enforce_created_by_owner() IS
  'BEFORE INSERT trigger: auto-preenche created_by com auth.uid() quando NULL e bloqueia spoofing por usuários sem privilégio elevado.';