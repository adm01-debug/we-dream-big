
-- Create follow_up_reminders table for tracking client follow-ups
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'follow_up', -- follow_up, meeting, call, email, quote
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follow_up_reminders' AND policyname = 'Users can view their own reminders') THEN
    CREATE POLICY "Users can view their own reminders"
    ON public.follow_up_reminders
    FOR SELECT
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follow_up_reminders' AND policyname = 'Users can create their own reminders') THEN
    CREATE POLICY "Users can create their own reminders"
    ON public.follow_up_reminders
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follow_up_reminders' AND policyname = 'Users can update their own reminders') THEN
    CREATE POLICY "Users can update their own reminders"
    ON public.follow_up_reminders
    FOR UPDATE
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follow_up_reminders' AND policyname = 'Users can delete their own reminders') THEN
    CREATE POLICY "Users can delete their own reminders"
    ON public.follow_up_reminders
    FOR DELETE
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_follow_up_reminders_updated_at ON public.follow_up_reminders;
CREATE TRIGGER update_follow_up_reminders_updated_at
BEFORE UPDATE ON public.follow_up_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_user_date ON public.follow_up_reminders(user_id, reminder_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_client ON public.follow_up_reminders(client_id);
