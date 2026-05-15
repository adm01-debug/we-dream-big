-- Create voice command analytics table
CREATE TABLE IF NOT EXISTS public.voice_command_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transcript TEXT NOT NULL,
  action TEXT NOT NULL,
  response TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_command_logs' AND policyname = 'Users can view own voice logs') THEN
    CREATE POLICY "Users can view own voice logs"
    ON public.voice_command_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_command_logs' AND policyname = 'Users can insert own voice logs') THEN
    CREATE POLICY "Users can insert own voice logs"
    ON public.voice_command_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Admins/managers can view all logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_command_logs' AND policyname = 'Admins can view all voice logs') THEN
    CREATE POLICY "Admins can view all voice logs"
    ON public.voice_command_logs
    FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());
  END IF;
END $$;

-- Index for querying by user and date
CREATE INDEX IF NOT EXISTS idx_voice_command_logs_user_created 
ON public.voice_command_logs (user_id, created_at DESC);