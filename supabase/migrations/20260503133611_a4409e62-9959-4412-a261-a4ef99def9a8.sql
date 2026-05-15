-- Função para registrar auditoria de logout (chamada via client)
CREATE OR REPLACE FUNCTION public.log_user_logout()
RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    user_id,
    action,
    resource_type,
    status,
    source,
    details
  ) VALUES (
    auth.uid(),
    'user.logout',
    'auth',
    'success',
    'client.auth',
    jsonb_build_object('timestamp', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir que a tabela de revogações está protegida e acessível
GRANT SELECT ON public.user_token_revocations TO authenticated;
