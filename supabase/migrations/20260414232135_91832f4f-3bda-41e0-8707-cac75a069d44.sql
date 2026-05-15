-- Trigger: notificar admins quando vendedor solicita aprovação de desconto
-- e notificar vendedor quando admin responde
DROP TRIGGER IF EXISTS trg_notify_discount_approval ON public.discount_approval_requests;
CREATE TRIGGER trg_notify_discount_approval
  AFTER INSERT OR UPDATE ON public.discount_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_discount_approval_request();

-- Trigger: validar status da solicitação
DROP TRIGGER IF EXISTS trg_validate_discount_status ON public.discount_approval_requests;
CREATE TRIGGER trg_validate_discount_status
  BEFORE INSERT OR UPDATE ON public.discount_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_discount_approval_status();