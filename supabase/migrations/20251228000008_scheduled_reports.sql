CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  report_type TEXT,
  schedule_cron TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
