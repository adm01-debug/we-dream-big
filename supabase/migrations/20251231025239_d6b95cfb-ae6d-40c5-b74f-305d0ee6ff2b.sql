-- Habilitar realtime para password_reset_requests
ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests;