-- Migration: analytics_events
-- Description: Analytics tracking
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view analytics_events" ON analytics_events;
CREATE POLICY "Users can view analytics_events"
  ON analytics_events FOR SELECT
  USING (true);
