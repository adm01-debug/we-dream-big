-- =====================================================
-- Migration 003 - Templates e Webhooks
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  
  variables TEXT[],
  default_priority INT DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_template UNIQUE (system, event_type, channel)
);

CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  system TEXT NOT NULL,
  
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  max_retries INT DEFAULT 3,
  retry_delay_seconds INT DEFAULT 60,
  
  last_triggered_at TIMESTAMPTZ,
  total_calls INT DEFAULT 0,
  failed_calls INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  status_code INT,
  response_body TEXT,
  success BOOLEAN,
  
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);
