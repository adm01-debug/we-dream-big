ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_credentials;
ALTER TABLE public.integration_credentials REPLICA IDENTITY FULL;