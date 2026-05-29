import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { SortOption } from '@/hooks/products/useCatalogState';
import type { Json } from '@/integrations/supabase/types';

interface CatalogPreferences {
  sortBy: SortOption;
}

const DEFAULT_PREFERENCES: CatalogPreferences = {
  sortBy: 'relevance',
};

const STORAGE_KEY = 'catalog_preferences';

export function useCatalogPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferencesState] = useState<CatalogPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  const { data: cloudPreferences } = useQuery({
    queryKey: ['catalog-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (error || !data?.preferences) return null;

      const prefs = data.preferences as Record<string, unknown>;
      if (!prefs?.catalog) return null;
      return prefs.catalog as CatalogPreferences;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const saveToCloudMutation = useMutation({
    mutationFn: async (prefs: CatalogPreferences) => {
      if (!user) return;

      const { data: existingData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      const existingPrefs = (existingData?.preferences as Record<string, unknown>) || {};

      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...existingPrefs,
            catalog: prefs,
          } as unknown as Json,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
  });

  useEffect(() => {
    if (cloudPreferences) {
      setPreferencesState(cloudPreferences);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudPreferences));
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setPreferencesState(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing catalog preferences', e);
        }
      }
    }
    setIsLoaded(true);
  }, [cloudPreferences]);

  const updatePreferences = useCallback(
    (newPrefs: Partial<CatalogPreferences>) => {
      setPreferencesState((prev) => {
        const updated = { ...prev, ...newPrefs };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        
        if (user) {
          saveToCloudMutation.mutate(updated);
        }
        
        return updated;
      });
    },
    [user, saveToCloudMutation],
  );

  return {
    preferences,
    isLoaded,
    updatePreferences,
  };
}
