-- Create scheduled reports table
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'sales',
  frequency text NOT NULL DEFAULT 'weekly',
  email_to text NOT NULL,
  report_name text NOT NULL DEFAULT 'Relatório',
  filters jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT valid_report_type CHECK (report_type IN ('sales', 'quotes', 'clients', 'products', 'orders'))
);

-- Add missing columns if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='frequency') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN frequency text NOT NULL DEFAULT 'weekly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='email_to') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN email_to text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='report_name') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN report_name text NOT NULL DEFAULT 'Relatório';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='filters') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN filters jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='is_active') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='last_sent_at') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN last_sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='next_run_at') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN next_run_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_reports' AND column_name='updated_at') THEN
    ALTER TABLE public.scheduled_reports ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_reports' AND policyname = 'Users can view own scheduled reports') THEN
    CREATE POLICY "Users can view own scheduled reports"
      ON public.scheduled_reports FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_reports' AND policyname = 'Users can create own scheduled reports') THEN
    CREATE POLICY "Users can create own scheduled reports"
      ON public.scheduled_reports FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_reports' AND policyname = 'Users can update own scheduled reports') THEN
    CREATE POLICY "Users can update own scheduled reports"
      ON public.scheduled_reports FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_reports' AND policyname = 'Users can delete own scheduled reports') THEN
    CREATE POLICY "Users can delete own scheduled reports"
      ON public.scheduled_reports FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index for cron job lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at) WHERE is_active = true;