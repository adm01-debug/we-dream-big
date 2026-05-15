-- Table for workspace notifications
CREATE TABLE IF NOT EXISTS public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_notifications' AND policyname = 'Users can read own notifications') THEN
    CREATE POLICY "Users can read own notifications"
      ON public.workspace_notifications FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications"
      ON public.workspace_notifications FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_notifications' AND policyname = 'Users can delete own notifications') THEN
    CREATE POLICY "Users can delete own notifications"
      ON public.workspace_notifications FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_notifications' AND policyname = 'System can insert notifications') THEN
    CREATE POLICY "System can insert notifications"
      ON public.workspace_notifications FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_notifications;

CREATE INDEX IF NOT EXISTS idx_workspace_notifications_user_unread 
  ON public.workspace_notifications (user_id, is_read, created_at DESC);