import { useState, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react';
import {
  getBridgeSamples,
  subscribeBridgeCalls,
  clearBridgeSamples,
  type BridgeCallSample,
} from '@/lib/telemetry/bridgeCallMetrics';
import {
  getLongTaskEvents,
  subscribeLongTasks,
  type LongTaskEvent,
} from '@/lib/telemetry/longTaskWatchdog';

const STORAGE_KEY = 'lov:bridge-metrics-overlay:open';
const MAX_VISIBLE = 60;
const EMPTY: BridgeCallSample[] = [];
const EMPTY_LT: LongTaskEvent[] = [];

export type BridgeMetricsFilter = 'all' | 'slow' | 'errors';
export type BridgeMetricsTab = 'calls' | 'longtasks';

export function useBridgeMetrics(isAllowed: boolean) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<BridgeMetricsFilter>('all');
  const [tab, setTab] = useState<BridgeMetricsTab>('calls');

  const samples = useSyncExternalStore(
    subscribeBridgeCalls,
    useCallback(() => (open && !paused ? getBridgeSamples() : EMPTY), [open, paused]),
    () => EMPTY,
  );

  const longTasks = useSyncExternalStore(
    subscribeLongTasks,
    useCallback(() => (open && !paused ? getLongTaskEvents() : EMPTY_LT), [open, paused]),
    () => EMPTY_LT,
  );

  useEffect(() => {
    if (!isAllowed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      e.preventDefault();
      setOpen((v) => {
        const next = !v;
        try {
          localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        } catch {
          /* noop */
        }
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAllowed]);

  const toggleOpen = useCallback((val?: boolean) => {
    setOpen((v) => {
      const next = val ?? !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const summary = useMemo(() => {
    const last20 = samples.slice(-20);
    const avg = last20.length
      ? Math.round(last20.reduce((a, s) => a + s.durationMs, 0) / last20.length)
      : 0;
    const totalResp = last20.reduce((a, s) => a + s.respBytes, 0);
    const errors = samples.filter((s) => !s.ok).length;
    return {
      total: samples.length,
      avg,
      totalResp,
      errors,
      last20: last20.length,
    };
  }, [samples]);

  const visibleSamples = useMemo(() => {
    let arr = samples.slice(-MAX_VISIBLE * 3);
    if (filter === 'slow') arr = arr.filter((s) => s.durationMs >= 600);
    else if (filter === 'errors') arr = arr.filter((s) => !s.ok);
    return arr.slice(-MAX_VISIBLE).reverse();
  }, [samples, filter]);

  return {
    open,
    setOpen: toggleOpen,
    paused,
    setPaused,
    filter,
    setFilter,
    tab,
    setTab,
    samples: visibleSamples,
    longTasks,
    summary,
    clear: clearBridgeSamples,
  };
}
