/**
 * notifications-metrics — lightweight in-memory counters for the bell prefetch flow.
 *
 * Tracks how often the UI *attempts* to prefetch (hover/focus, drawer open) versus
 * how often those attempts actually reach the network (cleared the 5s TTL gate
 * inside `useWorkspaceNotifications.prefetch`).
 *
 * Zero dependencies, no React. Safe to import from anywhere. In dev (or when
 * `localStorage["debug:notifications"] === "1"`) every increment also emits a
 * console line so you can eyeball the ratio in real time.
 *
 * Usage:
 *   import { notificationsMetrics } from "@/lib/notifications-metrics";
 *   notificationsMetrics.recordTrigger("hover");
 *   notificationsMetrics.recordFetch("prefetch");
 *   notificationsMetrics.snapshot();   // { triggers, fetches, byTrigger, byFetch, ratio }
 *
 * Exposed on window as `__notificationsMetrics` for ad-hoc inspection.
 */

export type TriggerSource = 'hover' | 'focus' | 'drawer-open';
export type FetchSource = 'initial' | 'polling' | 'prefetch' | 'mutation';
export type BadgeRenderSource = 'cache' | 'network';

export interface BadgeRenderStat {
  source: BadgeRenderSource;
  /** Time from hook mount to badge first paint (ms). Target: <16ms for cache. */
  elapsedMs: number;
  /** For cache renders: age of the cached payload (ms). null for network renders. */
  cacheAgeMs: number | null;
  /** For network renders: round-trip duration (ms). null for cache renders. */
  networkMs: number | null;
  unreadCount: number;
  hit: boolean;
  at: number;
}

/**
 * One end-to-end timing sample from the FIRST hover/focus event of a burst all
 * the way to the moment the bell's `prefetch()` promise resolved (or the
 * drawer-open path completed). Used to verify the debounce keeps end-to-end
 * latency well within the 5s prefetch TTL window.
 */
export interface TriggerToFetchTiming {
  /** Source of the FIRST event in the burst (hover/focus/drawer-open). */
  source: TriggerSource;
  /** ms from first event → debounce timer fired (queued the prefetch call). */
  debounceMs: number;
  /** ms from prefetch() invocation → promise resolved (network or TTL hit). */
  fetchMs: number;
  /** debounceMs + fetchMs. Should always be < TRIGGER_TO_FETCH_TTL_MS. */
  totalMs: number;
  /** Whether `totalMs < TRIGGER_TO_FETCH_TTL_MS` (5s TTL window). */
  withinTtl: boolean;
  /** How many trigger events were coalesced into this single prefetch. */
  coalescedTriggers: number;
  at: number;
}

/** Hit/miss counters for the <16ms badge-render budget. */
export interface BadgeRenderBudget {
  hits: number;
  misses: number;
  total: number;
  /** hits / total (0..1). */
  hitRate: number;
  /** Same breakdown but only counting cache renders (most relevant for the budget). */
  byCache: { hits: number; misses: number; total: number; hitRate: number };
  /** Same breakdown but only counting network renders. */
  byNetwork: { hits: number; misses: number; total: number; hitRate: number };
}

interface Snapshot {
  triggers: number;
  fetches: number;
  byTrigger: Record<TriggerSource, number>;
  byFetch: Record<FetchSource, number>;
  /** fetches / triggers — lower is better (more coalescing / TTL hits). */
  ratio: number;
  /**
   * Breakdown of fetches by their position relative to the 5s prefetch TTL
   * window since the previous fetch. The very first fetch (no prior fetch)
   * is counted as `afterTtl` because there was no live cache to deduplicate
   * against. Helps eyeball how often the TTL is actually doing its job.
   */
  fetchesByTtlWindow: { withinTtl: number; afterTtl: number };
  /**
   * Per-trigger-source coalescing efficiency, derived from
   * `recordTriggerToFetch` samples. For each source we accumulate the total
   * triggers absorbed (sum of `coalescedTriggers`) and the count of fetches
   * that actually fired. `efficiency = 1 - (fetches / triggers)` (clamped to
   * [0..1]); higher = more triggers coalesced per fetch. Sources with no
   * samples yet report all zeros.
   */
  coalescingByTrigger: Record<
    TriggerSource,
    { triggers: number; fetches: number; saved: number; efficiency: number }
  >;
  since: number;
  /** Last N badge render stats (most recent first). */
  badgeRenders: BadgeRenderStat[];
  lastBadgeRender: BadgeRenderStat | null;
  /** Running hit/miss counters for the <16ms render budget. */
  badgeBudget: BadgeRenderBudget;
  /** Last N trigger→fetch end-to-end timings (most recent first). */
  triggerToFetch: TriggerToFetchTiming[];
  lastTriggerToFetch: TriggerToFetchTiming | null;
  /** Number of timings that exceeded TRIGGER_TO_FETCH_TTL_MS. */
  triggerToFetchTtlBreaches: number;
}

const TRIGGER_TO_FETCH_HISTORY = 20;
/**
 * Hard ceiling for the trigger→prefetch round-trip. Matches the 5 s prefetch
 * TTL inside `useWorkspaceNotifications.prefetch`. Any sample above this is
 * counted as a "TTL breach" and warned to the console.
 */
export const TRIGGER_TO_FETCH_TTL_MS = 5000;

const BADGE_RENDER_HISTORY = 20;
/** Render budget threshold (ms). A render is a "hit" iff `elapsedMs < BUDGET_MS`. */
export const BADGE_RENDER_BUDGET_MS = 16;

const state = {
  triggers: 0,
  fetches: 0,
  byTrigger: { hover: 0, focus: 0, 'drawer-open': 0 } as Record<TriggerSource, number>,
  byFetch: { initial: 0, polling: 0, prefetch: 0, mutation: 0 } as Record<FetchSource, number>,
  /** Wall-clock of the most recent recordFetch() call, used for TTL-window classification. */
  lastFetchAt: 0,
  /** Fetches that landed within the 5s prefetch TTL window of the previous fetch. */
  fetchesWithinTtl: 0,
  /** Fetches that landed after the 5s window expired (or were the very first fetch). */
  fetchesAfterTtl: 0,
  since: Date.now(),
  badgeRenders: [] as BadgeRenderStat[],
  badgeBudget: {
    cache: { hits: 0, misses: 0 },
    network: { hits: 0, misses: 0 },
  },
  triggerToFetch: [] as TriggerToFetchTiming[],
  triggerToFetchTtlBreaches: 0,
  /**
   * Per-source coalescing aggregates fed by `recordTriggerToFetch`. We track
   * triggers (sum of coalescedTriggers from each sample) and fetches (sample
   * count) so that callers can derive `saved = triggers - fetches` and
   * `efficiency = saved / triggers`.
   */
  coalescingByTrigger: {
    hover: { triggers: 0, fetches: 0 },
    focus: { triggers: 0, fetches: 0 },
    'drawer-open': { triggers: 0, fetches: 0 },
  } as Record<TriggerSource, { triggers: number; fetches: number }>,
};

type BadgeListener = (stat: BadgeRenderStat) => void;
const badgeListeners = new Set<BadgeListener>();

function buildBudget(): BadgeRenderBudget {
  const c = state.badgeBudget.cache;
  const n = state.badgeBudget.network;
  const cTotal = c.hits + c.misses;
  const nTotal = n.hits + n.misses;
  const total = cTotal + nTotal;
  const hits = c.hits + n.hits;
  const misses = c.misses + n.misses;
  const rate = (h: number, t: number) => (t === 0 ? 0 : Number((h / t).toFixed(3)));
  return {
    hits,
    misses,
    total,
    hitRate: rate(hits, total),
    byCache: { hits: c.hits, misses: c.misses, total: cTotal, hitRate: rate(c.hits, cTotal) },
    byNetwork: { hits: n.hits, misses: n.misses, total: nTotal, hitRate: rate(n.hits, nTotal) },
  };
}

function isDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (window.localStorage?.getItem('debug:notifications') === '1') return true;
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Throttle window for console output (ms). Counters update instantly; only the
 * `console.log` side-effect is rate-limited. Within each window we emit at most
 * one leading log per event type and then a single trailing log carrying the
 * most recent payload + a `coalesced` count of suppressed entries.
 */
export const DEBUG_LOG_THROTTLE_MS = 1000;

interface ThrottleEntry {
  lastEmitAt: number;
  trailingTimer: ReturnType<typeof setTimeout> | null;
  pendingPayload: Record<string, unknown> | null;
  suppressed: number;
}
const throttleByEvent = new Map<string, ThrottleEntry>();

function emit(event: string, payload: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`%c[notifications-metrics:${event}]`, 'color:#0891b2;font-weight:600', payload);
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!isDebugEnabled()) return;
  const now = Date.now();
  let entry = throttleByEvent.get(event);
  if (!entry) {
    entry = { lastEmitAt: 0, trailingTimer: null, pendingPayload: null, suppressed: 0 };
    throttleByEvent.set(event, entry);
  }
  const elapsed = now - entry.lastEmitAt;
  if (elapsed >= DEBUG_LOG_THROTTLE_MS) {
    entry.lastEmitAt = now;
    entry.pendingPayload = null;
    entry.suppressed = 0;
    emit(event, payload);
    return;
  }
  // Within the throttle window: stash the latest payload and schedule a single
  // trailing emission so the most recent counters still surface.
  entry.pendingPayload = payload;
  entry.suppressed += 1;
  if (entry.trailingTimer) return;
  const wait = Math.max(0, DEBUG_LOG_THROTTLE_MS - elapsed);
  entry.trailingTimer = setTimeout(() => {
    const e = throttleByEvent.get(event);
    if (!e) return;
    e.trailingTimer = null;
    if (!e.pendingPayload) return;
    e.lastEmitAt = Date.now();
    emit(event, { ...e.pendingPayload, coalesced: e.suppressed });
    e.pendingPayload = null;
    e.suppressed = 0;
  }, wait);
}

/** Test helper: clear pending throttle timers + windows. */
function resetThrottle() {
  throttleByEvent.forEach((e) => {
    if (e.trailingTimer) clearTimeout(e.trailingTimer);
  });
  throttleByEvent.clear();
}

export const notificationsMetrics = {
  recordTrigger(source: TriggerSource) {
    state.triggers += 1;
    state.byTrigger[source] += 1;
    debugLog('trigger', {
      source,
      triggers: state.triggers,
      fetches: state.fetches,
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
    });
  },

  recordFetch(source: FetchSource) {
    state.fetches += 1;
    state.byFetch[source] += 1;
    // Classify this fetch relative to the 5s prefetch TTL window since the
    // previous fetch. The very first fetch (lastFetchAt === 0) is counted as
    // afterTtl because there was nothing to coalesce against.
    const now = Date.now();
    const sincePrevious = state.lastFetchAt === 0 ? Infinity : now - state.lastFetchAt;
    const withinTtl = sincePrevious < TRIGGER_TO_FETCH_TTL_MS;
    if (withinTtl) state.fetchesWithinTtl += 1;
    else state.fetchesAfterTtl += 1;
    state.lastFetchAt = now;
    debugLog('fetch', {
      source,
      triggers: state.triggers,
      fetches: state.fetches,
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
      withinTtl,
      msSincePrevious: sincePrevious === Infinity ? null : sincePrevious,
    });
  },

  recordBadgeRender(stat: Omit<BadgeRenderStat, 'at'>) {
    const isHit = stat.elapsedMs < BADGE_RENDER_BUDGET_MS;
    // Trust the running counter to be derived from the same threshold so the
    // hit/miss totals stay consistent even if a caller passes a stale `hit`.
    const normalized: Omit<BadgeRenderStat, 'at'> = { ...stat, hit: isHit };
    const full: BadgeRenderStat = { ...normalized, at: Date.now() };
    state.badgeRenders.unshift(full);
    if (state.badgeRenders.length > BADGE_RENDER_HISTORY) {
      state.badgeRenders.length = BADGE_RENDER_HISTORY;
    }
    const bucket = state.badgeBudget[stat.source];
    if (isHit) bucket.hits += 1;
    else bucket.misses += 1;
    debugLog('badge-render', {
      ...(full as unknown as Record<string, unknown>),
      budgetMs: BADGE_RENDER_BUDGET_MS,
    });
    badgeListeners.forEach((l) => {
      try {
        l(full);
      } catch {
        /* ignore */
      }
    });
  },

  subscribeBadgeRender(listener: BadgeListener): () => void {
    badgeListeners.add(listener);
    return () => {
      badgeListeners.delete(listener);
    };
  },

  /**
   * Emit a one-shot summary log of the current badge-render budget. Safe to
   * call from React unmount cleanups — silently no-ops if debug is OFF or if
   * no badge renders have been recorded yet.
   */
  logBadgeBudgetSummary(reason: string = 'unmount') {
    if (!isDebugEnabled()) return;
    const budget = buildBudget();
    if (budget.total === 0) return;
    debugLog('badge-budget-summary', {
      reason,
      budgetMs: BADGE_RENDER_BUDGET_MS,
      ...budget,
    });
  },

  /**
   * Record one end-to-end trigger→prefetch round-trip. Should be called from
   * the bell after the prefetch promise resolves, with the timestamp of the
   * FIRST event in the burst (so debounceMs reflects the wait that actually
   * coalesced events).
   */
  recordTriggerToFetch(sample: Omit<TriggerToFetchTiming, 'totalMs' | 'withinTtl' | 'at'>) {
    const totalMs = Number((sample.debounceMs + sample.fetchMs).toFixed(2));
    const withinTtl = totalMs < TRIGGER_TO_FETCH_TTL_MS;
    const full: TriggerToFetchTiming = {
      ...sample,
      debounceMs: Number(sample.debounceMs.toFixed(2)),
      fetchMs: Number(sample.fetchMs.toFixed(2)),
      totalMs,
      withinTtl,
      at: Date.now(),
    };
    state.triggerToFetch.unshift(full);
    if (state.triggerToFetch.length > TRIGGER_TO_FETCH_HISTORY) {
      state.triggerToFetch.length = TRIGGER_TO_FETCH_HISTORY;
    }
    // Accumulate per-source coalescing aggregates. `coalescedTriggers` already
    // includes the very first event of the burst, so it == total triggers
    // absorbed by THIS one fetch (never < 1 for a real burst).
    const bucket = state.coalescingByTrigger[sample.source];
    bucket.triggers += Math.max(1, sample.coalescedTriggers);
    bucket.fetches += 1;
    if (!withinTtl) {
      state.triggerToFetchTtlBreaches += 1;
      // Always warn on breach — even with debug OFF — since this signals
      // a real regression of the prefetch debounce vs TTL contract.

      console.warn(
        `[notifications-metrics] trigger→fetch exceeded TTL window (${totalMs}ms >= ${TRIGGER_TO_FETCH_TTL_MS}ms)`,
        full,
      );
    }
    debugLog('trigger-to-fetch', {
      ...(full as unknown as Record<string, unknown>),
      ttlMs: TRIGGER_TO_FETCH_TTL_MS,
    });
  },

  snapshot(): Snapshot {
    return {
      triggers: state.triggers,
      fetches: state.fetches,
      byTrigger: { ...state.byTrigger },
      byFetch: { ...state.byFetch },
      ratio: state.triggers === 0 ? 0 : Number((state.fetches / state.triggers).toFixed(3)),
      fetchesByTtlWindow: {
        withinTtl: state.fetchesWithinTtl,
        afterTtl: state.fetchesAfterTtl,
      },
      since: state.since,
      badgeRenders: [...state.badgeRenders],
      lastBadgeRender: state.badgeRenders[0] ?? null,
      badgeBudget: buildBudget(),
      triggerToFetch: [...state.triggerToFetch],
      lastTriggerToFetch: state.triggerToFetch[0] ?? null,
      triggerToFetchTtlBreaches: state.triggerToFetchTtlBreaches,
      coalescingByTrigger: (Object.keys(state.coalescingByTrigger) as TriggerSource[]).reduce(
        (acc, src) => {
          const { triggers, fetches } = state.coalescingByTrigger[src];
          const saved = Math.max(0, triggers - fetches);
          const efficiency = triggers === 0 ? 0 : Number((saved / triggers).toFixed(3));
          acc[src] = { triggers, fetches, saved, efficiency };
          return acc;
        },
        {} as Snapshot['coalescingByTrigger'],
      ),
    };
  },

  reset() {
    state.triggers = 0;
    state.fetches = 0;
    state.byTrigger = { hover: 0, focus: 0, 'drawer-open': 0 };
    state.byFetch = { initial: 0, polling: 0, prefetch: 0, mutation: 0 };
    state.lastFetchAt = 0;
    state.fetchesWithinTtl = 0;
    state.fetchesAfterTtl = 0;
    state.badgeRenders = [];
    state.badgeBudget = {
      cache: { hits: 0, misses: 0 },
      network: { hits: 0, misses: 0 },
    };
    state.triggerToFetch = [];
    state.triggerToFetchTtlBreaches = 0;
    state.coalescingByTrigger = {
      hover: { triggers: 0, fetches: 0 },
      focus: { triggers: 0, fetches: 0 },
      'drawer-open': { triggers: 0, fetches: 0 },
    };
    state.since = Date.now();
    resetThrottle();
  },

  /**
   * Start a periodic auto-reset (default 15 min). Counters reset to zero on
   * every tick so dashboards always reflect a fresh window. Calling again
   * replaces the existing interval. Returns a stop function. No-op in SSR.
   */
  startAutoReset(intervalMs: number = AUTO_RESET_INTERVAL_MS): () => void {
    this.stopAutoReset();
    if (typeof window === 'undefined') return () => {};
    autoResetIntervalMs = intervalMs;
    autoResetTimer = setInterval(() => {
      const prev = this.snapshot();
      this.reset();
      debugLog('auto-reset', {
        intervalMs,
        prevTriggers: prev.triggers,
        prevFetches: prev.fetches,
        prevRatio: prev.ratio,
        prevBadgeBudget: prev.badgeBudget,
      });
    }, intervalMs);
    return () => this.stopAutoReset();
  },

  stopAutoReset() {
    if (autoResetTimer) {
      clearInterval(autoResetTimer);
      autoResetTimer = null;
    }
  },

  getAutoResetConfig(): { running: boolean; intervalMs: number; nextResetAt: number | null } {
    return {
      running: autoResetTimer !== null,
      intervalMs: autoResetIntervalMs,
      nextResetAt: autoResetTimer !== null ? state.since + autoResetIntervalMs : null,
    };
  },
};

/** Default auto-reset cadence: 15 minutes. */
export const AUTO_RESET_INTERVAL_MS = 15 * 60 * 1000;
let autoResetTimer: ReturnType<typeof setInterval> | null = null;
let autoResetIntervalMs = AUTO_RESET_INTERVAL_MS;

// Expose for devtools inspection: window.__notificationsMetrics.snapshot()
if (typeof window !== 'undefined') {
  (
    window as unknown as { __notificationsMetrics?: typeof notificationsMetrics }
  ).__notificationsMetrics = notificationsMetrics;
  // Auto-start the 15-minute reset cycle on module load (browser only).
  notificationsMetrics.startAutoReset();
}
