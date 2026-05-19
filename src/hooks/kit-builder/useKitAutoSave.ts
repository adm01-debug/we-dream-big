/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { KitState } from '@/lib/kit-builder';
import { logger } from '@/lib/logger';

const AUTO_SAVE_DELAY_MS = 5000;

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
}

export function useKitAutoSave(
  kitState: KitState,
  kitQuantity: number,
  currentKitId: string | undefined,
  onKitIdCreated?: (id: string) => void,
): AutoSaveResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavedKitId, setAutoSavedKitId] = useState<string | null>(currentKitId || null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const snapshotRef = useRef<string>('');
  const isFirstRender = useRef(true);

  const saveToDb = useCallback(async () => {
    if (!user?.id) return;

    // Don't auto-save empty kits
    if (!kitState.box && kitState.items.length === 0) return;

    const payload = {
      user_id: user.id,
      name: kitState.name || 'Kit sem nome',
      status: 'draft' as const,
      kit_type: kitState.kitType || 'montado',
      box_data: kitState.box ? JSON.parse(JSON.stringify(kitState.box)) : null,
      items_data: JSON.parse(JSON.stringify(kitState.items)),
      personalization_data: JSON.parse(JSON.stringify(kitState.personalization)),
      kit_quantity: kitQuantity,
      box_price: kitState.boxPrice,
      items_price: kitState.itemsPrice,
      personalization_price: kitState.personalizationPrice,
      total_price: kitState.totalPrice,
      volume_usage_percent: kitState.volumeUsagePercent,
      updated_at: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const kitId = autoSavedKitId || currentKitId;
      if (kitId) {
        await supabase.from('custom_kits').update(payload).eq('id', kitId).eq('user_id', user.id);
      } else {
        const { data } = await supabase.from('custom_kits').insert(payload).select('id').single();
        if (data) {
          setAutoSavedKitId(data.id);
          onKitIdCreated?.(data.id);
        }
      }
      setLastSavedAt(new Date());
    } catch (err) {
      logger.warn('[auto-save] Failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, kitState, kitQuantity, autoSavedKitId, currentKitId, onKitIdCreated]);

  // Create a snapshot hash to detect meaningful changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      snapshotRef.current = JSON.stringify({
        box: kitState.box?.id,
        items: kitState.items.map((i) => `${i.id}:${i.quantity}`),
        personalization: kitState.personalization,
        name: kitState.name,
        qty: kitQuantity,
      });
      return;
    }

    const newSnapshot = JSON.stringify({
      box: kitState.box?.id,
      items: kitState.items.map((i) => `${i.id}:${i.quantity}`),
      personalization: kitState.personalization,
      name: kitState.name,
      qty: kitQuantity,
    });

    if (newSnapshot === snapshotRef.current) return;
    snapshotRef.current = newSnapshot;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveToDb, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    kitState.box?.id,
    kitState.items,
    kitState.personalization,
    kitState.name,
    kitQuantity,
    saveToDb,
  ]);

  // Update autoSavedKitId when currentKitId changes externally
  useEffect(() => {
    if (currentKitId) setAutoSavedKitId(currentKitId);
  }, [currentKitId]);

  return { lastSavedAt, isSaving, autoSavedKitId };
}
