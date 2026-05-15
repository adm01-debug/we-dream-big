-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.5_misc_cross_cutting - RPCs follow-up post merge
-- 19 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: get_unread_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_count() RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_val
  FROM public.workspace_notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
  RETURN count_val;
END;
$$;


--

--

--

-- Name: mark_all_notifications_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_all_notifications_read() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.workspace_notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$;


--

--

--

-- Name: mark_notification_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notification_read(p_notification_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.workspace_notifications
  SET is_read = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;


--

--

--

-- Name: is_dnd_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_dnd_active() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  dnd_enabled BOOLEAN;
  dnd_start TIME;
  dnd_end TIME;
  current_t TIME;
BEGIN
  SELECT 
    COALESCE((preferences->>'dnd_enabled')::boolean, false),
    (preferences->>'dnd_start')::time,
    (preferences->>'dnd_end')::time
  INTO dnd_enabled, dnd_start, dnd_end
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF NOT dnd_enabled OR dnd_start IS NULL OR dnd_end IS NULL THEN
    RETURN FALSE;
  END IF;
  
  current_t := LOCALTIME;
  
  IF dnd_start <= dnd_end THEN
    RETURN current_t BETWEEN dnd_start AND dnd_end;
  ELSE
    RETURN current_t >= dnd_start OR current_t <= dnd_end;
  END IF;
END;
$$;


--

--

--

-- Name: has_org_role(uuid, uuid, public.org_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.org_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;


--

--

--

-- Name: get_user_org_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_org_ids(_user_id uuid) RETURNS TABLE(organization_id uuid)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;


--

--

--

-- Name: create_organization_with_owner(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_organization_with_owner(_name text, _slug text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _org_id uuid;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  -- Add the caller as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'owner');

  RETURN _org_id;
END;
$$;


--

--

--

-- Name: is_org_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;


--

--

--

-- Name: is_seller_only(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_seller_only(_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id,'vendedor'::public.app_role)
     AND NOT public.can_manage_quotes(_user_id)
     AND NOT public.is_admin_strict(_user_id)
$$;


--

--

--

-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_short text;
  max_num integer;
BEGIN
  year_short := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CASE WHEN split_part(order_number, '-', 3) ~ '^\d+$'
         THEN split_part(order_number, '-', 3)::integer
         ELSE 0 END
  ), 0)
  INTO max_num
  FROM public.orders
  WHERE order_number LIKE 'PED-' || year_short || '-%';
  
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PED-' || year_short || '-' || lpad((max_num + 1)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$_$;


--

--

--

-- Name: generate_order_number_v3(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number_v3() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    year_suffix TEXT := to_char(now(), 'YY');
    next_val INTEGER;
BEGIN
    IF NEW.order_number IS NULL THEN
        SELECT count(*) + 1 INTO next_val 
        FROM public.orders 
        WHERE order_number LIKE 'PED-' || year_suffix || '-%';
        
        NEW.order_number := 'PED-' || year_suffix || '-' || lpad(next_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


--

--

--

-- Name: generate_order_number_v5(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number_v5() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    year_suffix TEXT := to_char(now(), 'YY');
    next_val INTEGER;
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SELECT count(*) + 1 INTO next_val 
        FROM public.orders 
        WHERE order_number LIKE 'PED-' || year_suffix || '-%';
        
        NEW.order_number := 'PED-' || year_suffix || '-' || lpad(next_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


--

--

--

-- Name: notify_new_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (
    NEW.seller_id,
    '🎉 Novo pedido recebido!',
    'Pedido ' || NEW.order_number || COALESCE(' de ' || NEW.client_name, '') || ' foi criado.',
    'success',
    'orders',
    '/pedidos'
  );

  RETURN NEW;
END;
$$;


--

--

--

-- Name: validate_secret_rotation_action_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_secret_rotation_action_type() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.action_type NOT IN ('set', 'rotate') THEN
    RAISE EXCEPTION 'Invalid action_type: must be set or rotate';
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: validate_status_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_status_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval', 'converted', 'viewed') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
      RAISE EXCEPTION 'Invalid token status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'quote_approval_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded') THEN
      RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--

--

--

-- Name: record_app_vital(text, double precision, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_app_vital(_name text, _value double precision, _rating text DEFAULT NULL::text, _req_id text DEFAULT NULL::text, _url text DEFAULT NULL::text, _ua text DEFAULT NULL::text, _uid uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.app_vitals (
    metric_name, 
    metric_value, 
    rating, 
    request_id, 
    page_url, 
    user_agent, 
    user_id
  )
  VALUES (
    _name, 
    _value, 
    _rating, 
    _req_id, 
    _url, 
    _ua, 
    _uid
  );
END;
$$;


--

--

--

-- Name: enforce_created_by_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_created_by_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--

--

--

-- Name: get_client_seasonality(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_client_seasonality(_client_id text, _months integer DEFAULT 24) RETURNS TABLE(year integer, month integer, quotes_count bigint, total_revenue numeric, avg_ticket numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    EXTRACT(YEAR FROM q.created_at)::int AS year,
    EXTRACT(MONTH FROM q.created_at)::int AS month,
    COUNT(*)::bigint AS quotes_count,
    COALESCE(SUM(q.total), 0)::numeric AS total_revenue,
    COALESCE(AVG(q.total), 0)::numeric AS avg_ticket
  FROM public.quotes q
  WHERE q.client_id = _client_id
    AND q.status IN ('sent','viewed','approved','converted','pending_approval')
    AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
    AND (
      q.seller_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;


--

--

--

-- Name: get_industry_seasonality(text[], integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_industry_seasonality(_company_ids text[], _months integer DEFAULT 24) RETURNS TABLE(year integer, month integer, avg_quotes_per_company numeric, avg_revenue_per_company numeric, companies_active bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH per_client_month AS (
    SELECT
      q.client_id,
      EXTRACT(YEAR FROM q.created_at)::int AS y,
      EXTRACT(MONTH FROM q.created_at)::int AS m,
      COUNT(*)::numeric AS qc,
      COALESCE(SUM(q.total), 0)::numeric AS rev
    FROM public.quotes q
    WHERE q.client_id = ANY(_company_ids)
      AND q.status IN ('sent','viewed','approved','converted','pending_approval')
      AND q.created_at >= now() - (GREATEST(_months, 1) || ' months')::interval
      AND auth.uid() IS NOT NULL
    GROUP BY q.client_id, 2, 3
  )
  SELECT
    y AS year,
    m AS month,
    AVG(qc)::numeric AS avg_quotes_per_company,
    AVG(rev)::numeric AS avg_revenue_per_company,
    COUNT(DISTINCT client_id)::bigint AS companies_active
  FROM per_client_month
  GROUP BY y, m
  ORDER BY y, m;
$$;


--

--

COMMIT;
