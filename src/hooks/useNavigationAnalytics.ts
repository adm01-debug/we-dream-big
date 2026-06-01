import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export function useNavigationAnalytics() {
  const { user } = useAuth();
  const location = useLocation();

  const trackNavigationClick = useCallback(
    async (buttonName: 'Início' | 'Teletransporte', destination?: string) => {
      if (!user?.id) return;

      try {
        // A tabela navigation_analytics usa o schema:
        //   event_type TEXT NOT NULL   -- categoria do evento
        //   event_data JSONB           -- payload livre
        //
        // Não tem button_name / source_path / destination_path / timestamp
        // como colunas diretas -- esses valores vão dentro de event_data.
        await supabase.from('navigation_analytics').insert({
          user_id: user.id,
          event_type: 'navigation_click',
          event_data: {
            button_name: buttonName,
            source_path: location.pathname,
            destination_path: destination ?? null,
          },
        });
      } catch {
        // Silently ignore tracking errors
      }
    },
    [user?.id, location.pathname],
  );

  return { trackNavigationClick };
}
