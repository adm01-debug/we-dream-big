-- ═══════════════════════════════════════════════════════════════════
-- BATCH D.4.5_reactions_trash - RPCs follow-up post merge
-- 3 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: move_favorite_to_trash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_favorite_to_trash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save
  );
  RETURN OLD;
END;
$$;


--

--

--

-- Name: cleanup_expired_favorite_trash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_favorite_trash() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _deleted INTEGER;
BEGIN
  DELETE FROM public.favorite_items_trash WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;


--

--

--

-- Name: cleanup_expired_public_comparisons(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_public_comparisons() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.user_comparisons
    SET is_public = false,
        share_token = NULL,
        share_expires_at = NULL
    WHERE is_public = true
      AND share_expires_at IS NOT NULL
      AND share_expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;


--

--

COMMIT;
