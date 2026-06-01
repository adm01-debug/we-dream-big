-- Ajustes na tabela workspace_notifications
-- Guard: tabelas podem não existir em preview snapshots.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspace_notifications') THEN
    EXECUTE 'ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can read own notifications" ON public.workspace_notifications';
    EXECUTE 'CREATE POLICY "Users can read own notifications" ON public.workspace_notifications FOR SELECT USING (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "Users can update own notifications" ON public.workspace_notifications';
    EXECUTE 'CREATE POLICY "Users can update own notifications" ON public.workspace_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own notifications" ON public.workspace_notifications';
    EXECUTE 'CREATE POLICY "Users can delete own notifications" ON public.workspace_notifications FOR DELETE USING (auth.uid() = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS "System can insert notifications" ON public.workspace_notifications';
    EXECUTE 'CREATE POLICY "Users can insert notifications for themselves" ON public.workspace_notifications FOR INSERT WITH CHECK (auth.uid() = user_id)';

    EXECUTE 'GRANT ALL ON public.workspace_notifications TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_notifications TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_notification_preferences') THEN
    EXECUTE 'ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_notification_preferences';
    EXECUTE 'CREATE POLICY "Users can manage their own notification preferences" ON public.user_notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

    EXECUTE 'GRANT ALL ON public.user_notification_preferences TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_preferences TO authenticated';
  END IF;
END $$;
