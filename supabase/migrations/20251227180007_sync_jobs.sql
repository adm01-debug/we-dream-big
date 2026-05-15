-- Migration: Sync Jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table was created by legacy migration with different schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sync_jobs' AND column_name='created_by') THEN
    ALTER TABLE sync_jobs ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sync_jobs' AND column_name='status') THEN
    ALTER TABLE sync_jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON sync_jobs(created_at DESC);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own jobs" ON sync_jobs;
CREATE POLICY "Users can view own jobs" ON sync_jobs FOR SELECT USING (auth.uid() = created_by);
