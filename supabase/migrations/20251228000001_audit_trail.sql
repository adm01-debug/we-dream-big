-- Migration: audit_trail
-- Description: Audit logging
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_created ON audit_trail(created_at DESC);

-- RLS
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit_trail" ON audit_trail;
CREATE POLICY "Users can view audit_trail"
  ON audit_trail FOR SELECT
  USING (true);
