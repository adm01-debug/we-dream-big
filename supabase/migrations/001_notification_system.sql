-- =====================================================
-- SISTEMA UNIFICADO DE NOTIFICAÇÕES
-- Migration 001 - Tabelas Principais
-- =====================================================

-- Tabela principal de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'urgent'
  category TEXT DEFAULT 'system', -- 'approval', 'alert', 'reminder', 'system', 'social'
  
  -- Fonte
  source_system TEXT NOT NULL, -- 'compras', 'wms', 'dp', etc.
  source_entity_type TEXT,
  source_entity_id UUID,
  
  -- Canais
  channels TEXT[] DEFAULT ARRAY['in_app'], -- ['in_app', 'email', 'push', 'sms', 'whatsapp']
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Agrupamento
  group_key TEXT,
  is_grouped BOOLEAN DEFAULT false,
  group_count INT DEFAULT 1,
  
  -- Ações
  action_url TEXT,
  action_label TEXT,
  action_data JSONB,
  
  -- Prioridade e timing
  priority INT DEFAULT 0, -- 0=baixa, 1=normal, 2=alta, 3=urgente
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Tracking
  delivered_at TIMESTAMPTZ,
  delivery_status JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(group_key) WHERE group_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source_system, source_entity_type, source_entity_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Systems can create notifications" ON notifications;
CREATE POLICY "Systems can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_updated_at ON notifications;
-- Could not detect table for DROP TRIGGER IF EXISTS trigger_update_notification_updated_at
CREATE TRIGGER trigger_update_notification_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();
