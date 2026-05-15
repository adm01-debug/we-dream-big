
-- 1. Create seller_discount_limits table
CREATE TABLE IF NOT EXISTS public.seller_discount_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_discount_percent NUMERIC NOT NULL DEFAULT 5,
  set_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.seller_discount_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_discount_limits' AND policyname = 'Admins can manage all discount limits') THEN
    CREATE POLICY "Admins can manage all discount limits"
    ON public.seller_discount_limits FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_discount_limits' AND policyname = 'Sellers can read own discount limit') THEN
    CREATE POLICY "Sellers can read own discount limit"
    ON public.seller_discount_limits FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_seller_discount_limits_updated_at ON public.seller_discount_limits;
CREATE TRIGGER update_seller_discount_limits_updated_at
BEFORE UPDATE ON public.seller_discount_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create discount_approval_requests table
CREATE TABLE IF NOT EXISTS public.discount_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  requested_discount_percent NUMERIC NOT NULL,
  max_allowed_percent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_id UUID,
  admin_notes TEXT,
  seller_notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Admins can manage all approval requests') THEN
    CREATE POLICY "Admins can manage all approval requests"
    ON public.discount_approval_requests FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Sellers can read own approval requests') THEN
    CREATE POLICY "Sellers can read own approval requests"
    ON public.discount_approval_requests FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Sellers can create own approval requests') THEN
    CREATE POLICY "Sellers can create own approval requests"
    ON public.discount_approval_requests FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_discount_approval_requests_updated_at ON public.discount_approval_requests;
CREATE TRIGGER update_discount_approval_requests_updated_at
BEFORE UPDATE ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Validation trigger for discount_approval_requests status
CREATE OR REPLACE FUNCTION public.validate_discount_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid discount approval status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_discount_approval_status_trigger ON public.discount_approval_requests;
CREATE TRIGGER validate_discount_approval_status_trigger
BEFORE INSERT OR UPDATE ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_discount_approval_status();

-- 4. Update validate_status_fields to allow 'pending_approval' for quotes
CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval') THEN
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

-- 5. Notification trigger for discount approval requests
CREATE OR REPLACE FUNCTION public.notify_discount_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS notify_discount_approval_trigger ON public.discount_approval_requests;
CREATE TRIGGER notify_discount_approval_trigger
AFTER INSERT OR UPDATE ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_discount_approval_request();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_discount_approval_requests_quote_id ON public.discount_approval_requests(quote_id);
CREATE INDEX IF NOT EXISTS idx_discount_approval_requests_seller_id ON public.discount_approval_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_discount_approval_requests_status ON public.discount_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_discount_limits_user_id ON public.seller_discount_limits(user_id);
