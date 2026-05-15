DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workspace_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.workspace_notifications;
  END IF;
END $$;