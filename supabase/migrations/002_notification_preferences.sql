-- =====================================================
-- Migration 002 - Preferências do Usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Canais habilitados
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  
  -- Preferências por categoria
  preferences JSONB DEFAULT '{
    "approval": {"channels": ["in_app", "email", "push"], "priority": 3},
    "alert": {"channels": ["in_app", "push", "sms"], "priority": 2},
    "reminder": {"channels": ["in_app", "email"], "priority": 1},
    "system": {"channels": ["in_app"], "priority": 0},
    "social": {"channels": ["in_app"], "priority": 0}
  }'::jsonb,
  
  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start_time TIME,
  dnd_end_time TIME,
  dnd_days INT[],
  
  -- Digest
  digest_enabled BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily',
  digest_time TIME DEFAULT '09:00:00',
  digest_days INT[],
  
  -- Agrupamento
  grouping_enabled BOOLEAN DEFAULT true,
  grouping_window_minutes INT DEFAULT 5,
  
  -- Contatos
  phone_number TEXT,
  whatsapp_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
ON notification_preferences FOR ALL
USING (auth.uid() = user_id);

-- Função para criar preferências padrão
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_preferences ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_preferences ON auth.users;
CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
