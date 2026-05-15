-- ═══════════════════════════════════════════════════════════════════
-- BATCH D2.4_external_connections_extra - RPCs follow-up post merge
-- 3 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: trg_sync_external_connections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_sync_external_connections() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _secret_name text;
  _op text := TG_OP;
BEGIN
  _secret_name := COALESCE(NEW.secret_name, OLD.secret_name);
  IF (TG_OP = 'DELETE' AND OLD.secret_name LIKE 'EXTERNAL_%')
     OR (TG_OP IN ('INSERT','UPDATE') AND NEW.secret_name LIKE 'EXTERNAL_%') THEN
    PERFORM public.sync_external_connections_from_credentials(
      _secret_name, _op, auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;


--

--

--

-- Name: trim_connection_test_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trim_connection_test_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.connection_test_history
  WHERE connection_id = NEW.connection_id
    AND id NOT IN (
      SELECT id FROM public.connection_test_history
      WHERE connection_id = NEW.connection_id
      ORDER BY tested_at DESC
      LIMIT 200
    );
  RETURN NEW;
END;
$$;


--

--

--

-- Name: fill_integration_credential_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fill_integration_credential_metadata() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.length := COALESCE(char_length(NEW.secret_value), 0);
  IF NEW.length >= 4 THEN
    NEW.masked_suffix := right(NEW.secret_value, 4);
  ELSE
    NEW.masked_suffix := NEW.secret_value;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--

--

COMMIT;
