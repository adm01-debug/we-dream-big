-- Migration: optimization_logs
-- Description: Performance logs
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS optimization_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_optimization_logs_created ON optimization_logs(created_at DESC);

-- RLS
ALTER TABLE optimization_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view optimization_logs" ON optimization_logs;
CREATE POLICY "Users can view optimization_logs"
  ON optimization_logs FOR SELECT
  USING (true);
