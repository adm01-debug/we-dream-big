/**
 * Kit Undo/Redo Hook
 * Maintains a history stack of kit state snapshots.
 *
 * O snapshot guarda o estado COMPLETO e restaurável do kit (caixa, itens,
 * personalização, etc.) — não uma versão lossy (boxId/keys) que não permitia
 * restaurar fielmente. `useKitBuilder.restoreKitSnapshot` consome este shape.
 */

import { useState, useCallback, useRef } from 'react';
import type { KitBox, KitItem, KitType, KitIdentity, KitPersonalization } from '@/lib/kit-builder';

export interface KitSnapshot {
  name: string;
  kitType: KitType;
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  kitQuantity: number;
  identity?: KitIdentity;
}

const MAX_HISTORY = 30;

export function useKitUndoRedo() {
  const [history, setHistory] = useState<KitSnapshot[]>([]);
  const [future, setFuture] = useState<KitSnapshot[]>([]);
  const isRestoringRef = useRef(false);

  const pushSnapshot = useCallback((snapshot: KitSnapshot) => {
    if (isRestoringRef.current) return;
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return prev;
      const next = [...prev, snapshot];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setFuture([]);
  }, []);

  const canUndo = history.length > 1;
  const canRedo = future.length > 0;

  const undo = useCallback((): KitSnapshot | null => {
    if (history.length <= 1) return null;
    isRestoringRef.current = true;
    const newHistory = [...history];
    const current = newHistory.pop();
    if (!current) {
      isRestoringRef.current = false;
      return null;
    }
    const prev = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setFuture((f) => [current, ...f]);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
    return prev;
  }, [history]);

  const redo = useCallback((): KitSnapshot | null => {
    if (future.length === 0) return null;
    isRestoringRef.current = true;
    const [next, ...rest] = future;
    setFuture(rest);
    setHistory((prev) => [...prev, next]);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
    return next;
  }, [future]);

  const reset = useCallback(() => {
    setHistory([]);
    setFuture([]);
  }, []);

  return { pushSnapshot, undo, redo, canUndo, canRedo, reset, isRestoring: isRestoringRef };
}
