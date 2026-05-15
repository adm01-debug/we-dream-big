-- Migration: rate_limits
-- Description: API rate limits
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON rate_limits(created_at DESC);

-- RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view rate_limits" ON rate_limits;
CREATE POLICY "Users can view rate_limits"
  ON rate_limits FOR SELECT
  USING (true);
