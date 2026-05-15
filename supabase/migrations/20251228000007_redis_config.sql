-- Migration: redis_config
-- Description: Redis configuration
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS redis_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_redis_config_created ON redis_config(created_at DESC);

-- RLS
ALTER TABLE redis_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view redis_config" ON redis_config;
CREATE POLICY "Users can view redis_config"
  ON redis_config FOR SELECT
  USING (true);
