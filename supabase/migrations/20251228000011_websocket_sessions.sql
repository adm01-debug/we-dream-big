-- Migration: websocket_sessions
-- Description: WebSocket sessions
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS websocket_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_websocket_sessions_created ON websocket_sessions(created_at DESC);

-- RLS
ALTER TABLE websocket_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view websocket_sessions" ON websocket_sessions;
CREATE POLICY "Users can view websocket_sessions"
  ON websocket_sessions FOR SELECT
  USING (true);
