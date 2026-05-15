-- =====================================================
-- Migration 004 - Funções Auxiliares
-- =====================================================

-- Verifica se está em horário DND
CREATE OR REPLACE FUNCTION is_dnd_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_now TIME;
  v_day INT;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND OR NOT v_prefs.dnd_enabled THEN
    RETURN false;
  END IF;
  
  v_now := CURRENT_TIME;
  v_day := EXTRACT(DOW FROM NOW());
  
  IF v_prefs.dnd_days IS NOT NULL AND v_day = ANY(v_prefs.dnd_days) THEN
    RETURN true;
  END IF;
  
  IF v_prefs.dnd_start_time IS NOT NULL AND v_prefs.dnd_end_time IS NOT NULL THEN
    IF v_prefs.dnd_start_time < v_prefs.dnd_end_time THEN
      RETURN v_now >= v_prefs.dnd_start_time OR v_now <= v_prefs.dnd_end_time;
    ELSE
      RETURN v_now >= v_prefs.dnd_start_time AND v_now <= v_prefs.dnd_end_time;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE user_id = auth.uid()
    AND NOT is_read;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obter contador de não lidas
CREATE OR REPLACE FUNCTION get_unread_count()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM notifications
    WHERE user_id = auth.uid()
      AND NOT is_read
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpar notificações antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND is_read = true
    RETURNING *
  )
  SELECT COUNT(*)::INT INTO v_deleted FROM deleted;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
