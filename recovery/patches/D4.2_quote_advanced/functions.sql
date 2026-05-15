-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.2_quote_advanced - RPCs follow-up post merge
-- 16 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: convert_quote_to_order(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_quote_to_order(p_quote_id uuid, p_seller_id uuid, p_organization_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_quote RECORD;
    v_order_id UUID;
    v_order_number TEXT;
    v_item RECORD;
    v_new_item_id UUID;
BEGIN
    -- 1. Get quote data
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orçamento não encontrado';
    END IF;

    IF v_quote.status != 'approved' THEN
        RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos';
    END IF;

    -- 2. Check for existing order
    IF EXISTS (SELECT 1 FROM public.orders WHERE quote_id = p_quote_id) THEN
        RAISE EXCEPTION 'Este orçamento já foi convertido em pedido';
    END IF;

    -- 3. Create order
    INSERT INTO public.orders (
        seller_id, organization_id, quote_id, client_id, client_name, client_email,
        client_phone, client_company, subtotal, discount_amount, shipping_cost,
        shipping_type, total, payment_terms, delivery_time, notes, internal_notes,
        status, fulfillment_status
    ) VALUES (
        p_seller_id, COALESCE(p_organization_id, v_quote.organization_id), p_quote_id, 
        v_quote.client_id, v_quote.client_name, v_quote.client_email,
        v_quote.client_phone, v_quote.client_company, v_quote.subtotal, 
        v_quote.discount_amount, v_quote.shipping_cost,
        v_quote.shipping_type, v_quote.total, v_quote.payment_terms, 
        v_quote.delivery_time, v_quote.notes, v_quote.internal_notes,
        'confirmed', 'unfulfilled'
    ) RETURNING id, order_number INTO v_order_id, v_order_number;

    -- 4. Copy items
    FOR v_item IN SELECT * FROM public.quote_items WHERE quote_id = p_quote_id LOOP
        INSERT INTO public.order_items (
            order_id, organization_id, product_id, product_sku, product_name,
            product_image_url, quantity, unit_price, color_name, color_hex,
            notes, size_code, gender, kit_group_id, kit_name
        ) VALUES (
            v_order_id, COALESCE(p_organization_id, v_quote.organization_id), 
            v_item.product_id, v_item.product_sku, v_item.product_name,
            v_item.product_image_url, v_item.quantity, v_item.unit_price, 
            v_item.color_name, v_item.color_hex,
            v_item.notes, v_item.size_code, v_item.gender, 
            v_item.kit_group_id, v_item.kit_name
        ) RETURNING id INTO v_new_item_id;

        -- 5. Copy personalizations for each item
        INSERT INTO public.order_item_personalizations (
            order_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        )
        SELECT 
            v_new_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        FROM public.quote_item_personalizations
        WHERE quote_item_id = v_item.id;
    END LOOP;

    -- 6. Update quote status
    UPDATE public.quotes SET status = 'converted' WHERE id = p_quote_id;

    RETURN jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number,
        'status', 'confirmed'
    );
END;
$$;


--

--

--

-- Name: fn_create_quote_v3(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_quote_v3(p_quote_data jsonb, p_items_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_quote_id UUID;
    v_item RECORD;
    v_pers RECORD;
    v_new_item_id UUID;
    v_seller_id UUID := auth.uid();
    v_quote_number TEXT;
BEGIN
    -- Validação básica
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 1. Inserir Header
    INSERT INTO public.quotes (
        seller_id, client_id, client_name, client_email, client_phone, client_company, client_cnpj,
        status, subtotal, discount_percent, discount_amount, total,
        notes, internal_notes, valid_until, payment_terms, delivery_time,
        shipping_type, shipping_cost, negotiation_markup_percent,
        organization_id
    ) VALUES (
        v_seller_id,
        (p_quote_data->>'client_id'),
        (p_quote_data->>'client_name'),
        (p_quote_data->>'client_email'),
        (p_quote_data->>'client_phone'),
        (p_quote_data->>'client_company'),
        (p_quote_data->>'client_cnpj'),
        COALESCE(p_quote_data->>'status', 'draft'),
        (p_quote_data->>'subtotal')::NUMERIC,
        COALESCE((p_quote_data->>'discount_percent')::NUMERIC, 0),
        COALESCE((p_quote_data->>'discount_amount')::NUMERIC, 0),
        (p_quote_data->>'total')::NUMERIC,
        (p_quote_data->>'notes'),
        (p_quote_data->>'internal_notes'),
        (p_quote_data->>'valid_until')::TIMESTAMPTZ,
        (p_quote_data->>'payment_terms'),
        (p_quote_data->>'delivery_time'),
        (p_quote_data->>'shipping_type'),
        COALESCE((p_quote_data->>'shipping_cost')::NUMERIC, 0),
        COALESCE((p_quote_data->>'negotiation_markup_percent')::NUMERIC, 0),
        (p_quote_data->>'organization_id')::UUID
    ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

    -- 2. Inserir Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
    LOOP
        INSERT INTO public.quote_items (
            quote_id, product_id, product_name, product_sku, product_image_url,
            quantity, unit_price, subtotal, color_name, color_hex,
            size_code, gender, bitrix_product_id, sort_order, notes
        ) VALUES (
            v_quote_id,
            (v_item.value->>'product_id'),
            (v_item.value->>'product_name'),
            (v_item.value->>'product_sku'),
            (v_item.value->>'product_image_url'),
            (v_item.value->>'quantity')::INTEGER,
            (v_item.value->>'unit_price')::NUMERIC,
            (v_item.value->>'subtotal')::NUMERIC,
            (v_item.value->>'color_name'),
            (v_item.value->>'color_hex'),
            (v_item.value->>'size_code'),
            (v_item.value->>'gender'),
            (v_item.value->>'bitrix_product_id'),
            COALESCE((v_item.value->>'sort_order')::INTEGER, 0),
            (v_item.value->>'notes')
        ) RETURNING id INTO v_new_item_id;

        -- 3. Personalizações
        IF v_item.value ? 'personalizations' THEN
            FOR v_pers IN SELECT * FROM jsonb_array_elements(v_item.value->'personalizations')
            LOOP
                INSERT INTO public.quote_item_personalizations (
                    quote_item_id, technique_id, technique_name,
                    colors_count, positions_count, area_cm2, width_cm, height_cm,
                    setup_cost, unit_cost, total_cost, notes
                ) VALUES (
                    v_new_item_id,
                    (v_pers.value->>'technique_id'),
                    (v_pers.value->>'technique_name'),
                    COALESCE((v_pers.value->>'colors_count')::INTEGER, 1),
                    COALESCE((v_pers.value->>'positions_count')::INTEGER, 1),
                    (v_pers.value->>'area_cm2')::NUMERIC,
                    (v_pers.value->>'width_cm')::NUMERIC,
                    (v_pers.value->>'height_cm')::NUMERIC,
                    COALESCE((v_pers.value->>'setup_cost')::NUMERIC, 0),
                    COALESCE((v_pers.value->>'unit_cost')::NUMERIC, 0),
                    COALESCE((v_pers.value->>'total_cost')::NUMERIC, 0),
                    (v_pers.value->>'notes')
                );
            END LOOP;
        END IF;
    END LOOP;

    -- 4. Log de História
    INSERT INTO public.quote_history (quote_id, user_id, action, description)
    VALUES (v_quote_id, v_seller_id, 'created_v3', 'Orçamento criado via RPC atômico');

    RETURN jsonb_build_object('id', v_quote_id, 'quote_number', v_quote_number);
END;
$$;


--

--

--

-- Name: fn_save_quote_draft(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_quote_draft(p_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_draft_id UUID;
BEGIN
    INSERT INTO public.quote_drafts (user_id, data, last_saved_at)
    VALUES (auth.uid(), p_data, now())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, last_saved_at = now()
    RETURNING id INTO v_draft_id;
    RETURN v_draft_id;
END;
$$;


--

--

--

-- Name: generate_quote_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_short text;
  max_num integer;
  new_number text;
BEGIN
  year_short := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CASE WHEN split_part(quote_number, '/', 1) ~ '^\d+$'
         THEN split_part(quote_number, '/', 1)::integer
         ELSE 0 END
  ), 10000)
  INTO max_num
  FROM public.quotes
  WHERE quote_number LIKE '%/' || year_short;
  
  new_number := (max_num + 1)::text || '/' || year_short;
  
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := new_number;
  END IF;
  
  RETURN NEW;
END;
$_$;


--

--

--

-- Name: get_quote_token_by_value(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quote_token_by_value(_token text) RETURNS SETOF public.quote_approval_tokens
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT * FROM public.quote_approval_tokens WHERE token = _token LIMIT 1;
$$;


--

--

--

-- Name: invalidate_used_approval_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_used_approval_token() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When a response is recorded, mark as expired to prevent reuse
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded';
    -- Set expires_at to now to prevent any further use
    NEW.expires_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: submit_quote_response(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_quote_response(_token text, _response text, _response_notes text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Validate response value
  IF _response NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response value';
  END IF;

  -- Only update allowed fields on active, unexpired tokens
  UPDATE public.quote_approval_tokens
  SET 
    response = _response,
    response_notes = _response_notes,
    responded_at = now(),
    status = 'responded',
    updated_at = now()
  WHERE token = _token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND responded_at IS NULL;

  RETURN FOUND;
END;
$$;


--

--

--

-- Name: validate_quote_real_discount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_quote_real_discount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _markup       NUMERIC := COALESCE(NEW.negotiation_markup_percent, 0);
  _apparent_pct NUMERIC := COALESCE(NEW.discount_percent, 0);
  _presented    NUMERIC := COALESCE(NEW.subtotal, 0);
  _real_sub     NUMERIC;
  _final        NUMERIC;
  _real_pct     NUMERIC;
  _max_allowed  NUMERIC;
  _is_admin     BOOLEAN;
BEGIN
  IF _markup > 0 THEN
    _real_sub := _presented / (1 + _markup / 100);
  ELSE
    _real_sub := _presented;
  END IF;

  _final := _presented * (1 - _apparent_pct / 100);

  IF _real_sub > 0 THEN
    _real_pct := ROUND(((_real_sub - _final) / _real_sub) * 100, 2);
  ELSE
    _real_pct := 0;
  END IF;

  NEW.real_subtotal := ROUND(_real_sub, 2);
  NEW.real_discount_percent := _real_pct;

  IF NEW.status IN ('draft', 'pending') AND NEW.seller_id IS NOT NULL AND _real_pct > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.seller_id AND role = 'admin'
    ) INTO _is_admin;

    IF NOT _is_admin THEN
      SELECT max_discount_percent INTO _max_allowed
      FROM public.seller_discount_limits
      WHERE user_id = NEW.seller_id;

      IF _max_allowed IS NOT NULL AND _real_pct > _max_allowed THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.discount_approval_requests
          WHERE quote_id = NEW.id
            AND status = 'approved'
            AND requested_discount_percent >= _real_pct
        ) THEN
          RAISE EXCEPTION
            'Desconto real (%.2f%%) excede o limite do vendedor (%.2f%%). Solicite aprovação antes de salvar.',
            _real_pct, _max_allowed
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--

--

--

-- Name: can_manage_quotes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_quotes(_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('supervisor'::public.app_role,
                   'admin'::public.app_role,
                   'manager'::public.app_role)
  )
$$;


--

--

--

-- Name: validate_discount_approval_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_discount_approval_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid discount approval status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;


--

--

--

-- Name: can_approve_discount(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_approve_discount(_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.can_manage_quotes(_user_id)
$$;


--

--

--

-- Name: notify_discount_approval_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_discount_approval_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  seller_name TEXT;
  quote_num TEXT;
  admin_user RECORD;
BEGIN
  -- Only on new pending requests
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT full_name INTO seller_name FROM public.profiles WHERE user_id = NEW.seller_id;
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;

    -- Notify all admins
    FOR admin_user IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LOOP
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        admin_user.user_id,
        '⚠️ Desconto acima do limite',
        COALESCE(seller_name, 'Vendedor') || ' solicitou ' || NEW.requested_discount_percent || '% de desconto no orçamento ' || COALESCE(quote_num, '') || ' (limite: ' || NEW.max_allowed_percent || '%).',
        'warning',
        'quotes',
        '/admin/aprovacoes-desconto'
      );
    END LOOP;
  END IF;

  -- Notify seller on approval/rejection
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;
    
    IF NEW.status = 'approved' THEN
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        NEW.seller_id,
        '✅ Desconto aprovado!',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi aprovado.',
        'success',
        'quotes',
        '/orcamentos'
      );
    ELSE
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        NEW.seller_id,
        '❌ Desconto recusado',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi recusado.' || COALESCE(' Motivo: ' || NEW.admin_notes, ''),
        'warning',
        'quotes',
        '/orcamentos'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--

--

--

-- Name: notify_quote_client_response(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_quote_client_response() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  -- Only trigger when responded_at changes from null
  IF OLD.responded_at IS NOT NULL OR NEW.responded_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.response = 'approved' THEN
    notif_title := '🎉 Cliente aprovou o orçamento!';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' aprovou o orçamento via link de aprovação.';
    notif_type := 'success';
  ELSIF NEW.response = 'rejected' THEN
    notif_title := '😔 Cliente recusou o orçamento';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' recusou o orçamento via link de aprovação.';
    notif_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (NEW.seller_id, notif_title, notif_message, notif_type, 'quotes', '/orcamentos');

  RETURN NEW;
END;
$$;


--

--

--

-- Name: notify_quote_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_quote_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  notif_category TEXT;
  notif_url TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  notif_category := 'quotes';
  notif_url := '/orcamentos';

  CASE NEW.status
    WHEN 'approved' THEN
      notif_title := '✅ Orçamento aprovado!';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' foi aprovado!';
      notif_type := 'success';
    WHEN 'rejected' THEN
      notif_title := '❌ Orçamento recusado';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' foi recusado.';
      notif_type := 'warning';
    WHEN 'sent' THEN
      notif_title := '📤 Orçamento enviado';
      notif_message := 'O orçamento ' || NEW.quote_number || ' foi marcado como enviado.';
      notif_type := 'info';
    WHEN 'expired' THEN
      notif_title := '⏰ Orçamento expirado';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' expirou.';
      notif_type := 'warning';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (NEW.seller_id, notif_title, notif_message, notif_type, notif_category, notif_url);

  RETURN NEW;
END;
$$;


--

--

--

-- Name: seed_discount_test_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_discount_test_users() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
BEGIN
  -- Find existing test users by email in profiles
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  -- If users don't exist, return error (auth.users insertion requires Supabase Admin API, not SQL)
  IF _seller_id IS NULL OR _admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Test users not found. Create them via Supabase Admin API first.',
      'seller_exists', _seller_id IS NOT NULL,
      'admin_exists', _admin_id IS NOT NULL
    );
  END IF;

  -- Ensure roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_seller_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Sync role on profiles
  UPDATE public.profiles SET role = 'vendedor' WHERE user_id = _seller_id;
  UPDATE public.profiles SET role = 'admin' WHERE user_id = _admin_id;

  RETURN jsonb_build_object(
    'ok', true,
    'seller_id', _seller_id,
    'admin_id', _admin_id
  );
END;
$$;


--

--

--

-- Name: cleanup_discount_test_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_discount_test_data() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _seller_id uuid;
  _admin_id uuid;
  _quotes_deleted int := 0;
  _requests_deleted int := 0;
  _notifs_deleted int := 0;
BEGIN
  SELECT user_id INTO _seller_id FROM public.profiles WHERE email = 'seller-test@discount-approval.test' LIMIT 1;
  SELECT user_id INTO _admin_id FROM public.profiles WHERE email = 'admin-test@discount-approval.test' LIMIT 1;

  IF _seller_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'note', 'no test seller found, nothing to clean');
  END IF;

  -- Delete approval requests for seller-test quotes
  WITH deleted AS (
    DELETE FROM public.discount_approval_requests
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _requests_deleted FROM deleted;

  -- Delete quotes from test seller
  WITH deleted AS (
    DELETE FROM public.quotes
    WHERE seller_id = _seller_id
    RETURNING 1
  ) SELECT count(*) INTO _quotes_deleted FROM deleted;

  -- Delete test notifications
  WITH deleted AS (
    DELETE FROM public.workspace_notifications
    WHERE user_id IN (_seller_id, _admin_id)
      AND category IN ('discount', 'quotes')
    RETURNING 1
  ) SELECT count(*) INTO _notifs_deleted FROM deleted;

  RETURN jsonb_build_object(
    'ok', true,
    'requests_deleted', _requests_deleted,
    'quotes_deleted', _quotes_deleted,
    'notifications_deleted', _notifs_deleted
  );
END;
$$;


--

--

COMMIT;
