/**
 * usePositionHistory — Undo/Redo for logo positioning
 * 
 * Tracks position & size changes with a configurable history depth.
 * Supports Ctrl+Z (undo) and Ctrl+Shift+Z / Ctrl+Y (redo).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

interface PositionState {
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
}

interface UsePositionHistoryOptions {
  maxHistory?: number;
  enabled?: boolean;
}

export function usePositionHistory(options: UsePositionHistoryOptions = {}) {
  const { maxHistory = 30, enabled = true } = options;

  const [history, setHistory] = useState<PositionState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushState = useCallback((state: PositionState) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setHistory(prev => {
      // Truncate future states if we're in the middle of history
      const truncated = prev.slice(0, historyIndex + 1);
      const newHistory = [...truncated, state];
      // Keep within max limit
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, maxHistory - 1);
      return newIndex;
    });
  }, [historyIndex, maxHistory]);

  const undo = useCallback((): PositionState | null => {
    if (!canUndo) return null;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [canUndo, historyIndex, history]);

  const redo = useCallback((): PositionState | null => {
    if (!canRedo) return null;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [canRedo, historyIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
  const onUndoRedoRef = useRef<{ onApply: (state: PositionState) => void } | null>(null);

  const setOnApply = useCallback((fn: (state: PositionState) => void) => {
    onUndoRedoRef.current = { onApply: fn };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+Z → Undo
      if (isCtrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const state = undo();
        if (state && onUndoRedoRef.current) {
          onUndoRedoRef.current.onApply(state);
        }
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y → Redo
      if (isCtrl && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        const state = redo();
        if (state && onUndoRedoRef.current) {
          onUndoRedoRef.current.onApply(state);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, undo, redo]);

  return useMemo(() => ({
    pushState,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    setOnApply,
    historyLength: history.length,
    currentIndex: historyIndex,
  }), [pushState, undo, redo, clear, canUndo, canRedo, setOnApply, history.length, historyIndex]);
}
