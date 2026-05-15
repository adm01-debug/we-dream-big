-- Enable realtime for workspace_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_notifications;

-- Function to notify seller when quote status changes
CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to notify seller when a new order is created
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to notify when client responds to quote approval
CREATE OR REPLACE FUNCTION public.notify_quote_client_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create triggers
DROP TRIGGER IF EXISTS trg_notify_quote_status_change ON public.quotes;
CREATE TRIGGER trg_notify_quote_status_change
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_status_change();

DROP TRIGGER IF EXISTS trg_notify_new_order ON public.orders;
CREATE TRIGGER trg_notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_order();

DROP TRIGGER IF EXISTS trg_notify_quote_client_response ON public.quote_approval_tokens;
CREATE TRIGGER trg_notify_quote_client_response
AFTER UPDATE ON public.quote_approval_tokens
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_client_response();