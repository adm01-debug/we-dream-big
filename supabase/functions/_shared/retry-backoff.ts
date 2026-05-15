// supabase/functions/_shared/retry-backoff.ts
// Centralized retry policy with exponential backoff + decorrelated jitter.
//
// Why decorrelated jitter:
//   - Pure exponential backoff causes "thundering herd" when many parallel
//     callers (catalog fan-out, dashboards) retry on the same beat.
//   - Decorrelated jitter spreads retries across the [base, prevSleep*3] window,
//     converging faster on success while keeping tail latency bounded.
//   - Reference: AWS Architecture Blog — "Exponential Backoff And Jitter".
//
// We also enforce a hard `budgetMs` so the retry loop cannot exceed the time
// the caller is willing to wait — important for parallel batches where one
// slow query must not block the whole response.

export interface RetryOptions {
  /** Max attempts INCLUDING the first. Default: 3. */
  maxAttempts?: number;
  /** Base delay in ms (lower bound for the first sleep). Default: 80ms. */
  baseMs?: number;
  /** Cap for any single sleep, in ms. Default: 1500ms. */
  capMs?: number;
  /** Hard total budget for all retries combined. Default: 4000ms. */
  budgetMs?: number;
  /** Classifier — return true if the error is worth retrying. */
  isTransient?: (err: unknown) => boolean;
  /** Optional tag for logs. */
  label?: string;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
  totalMs: number;
}

const DEFAULT_TRANSIENT_PATTERNS = [
  'statement timeout',
  'canceling statement',
  'connection reset',
  'connection terminated',
  'econnreset',
  'etimedout',
  'fetch failed',
  'network',
  '503',
  '504',
  '57014', // query_canceled
  '08006', // connection_failure
  '08000', // connection_exception
];

export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return DEFAULT_TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Decorrelated jitter:
 *   sleep_n = min(cap, random_between(base, prev * 3))
 * Ensures non-monotonic, well-spread retry instants under high parallelism.
 */
export function nextDelayMs(prevMs: number, baseMs: number, capMs: number): number {
  const lo = baseMs;
  const hi = Math.max(baseMs, Math.min(capMs, prevMs * 3));
  const raw = lo + Math.random() * (hi - lo);
  return Math.min(capMs, Math.round(raw));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` with retry + decorrelated jitter. Stops early on:
 *   - success
 *   - non-transient error (returned/thrown immediately)
 *   - budget exhaustion
 *   - max attempts reached
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<RetryResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 80;
  const capMs = opts.capMs ?? 1500;
  const budgetMs = opts.budgetMs ?? 4000;
  const transient = opts.isTransient ?? isTransientError;
  const label = opts.label ?? 'retry';

  const t0 = performance.now();
  let prevDelay = baseMs;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn(attempt);
      return { value, attempts: attempt, totalMs: Math.round(performance.now() - t0) };
    } catch (err) {
      lastErr = err;
      const elapsed = performance.now() - t0;

      if (!transient(err) || attempt === maxAttempts) {
        throw err;
      }

      // Compute next sleep, but never overshoot the budget.
      const remainingBudget = budgetMs - elapsed;
      if (remainingBudget <= baseMs) {
        console.warn(`[${label}] budget exhausted after ${Math.round(elapsed)}ms (attempt ${attempt}/${maxAttempts})`);
        throw err;
      }

      const delay = Math.min(nextDelayMs(prevDelay, baseMs, capMs), remainingBudget);
      prevDelay = delay;

      console.warn(`[${label}] attempt ${attempt} failed (${(err as Error).message ?? err}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Unreachable, but keeps TS happy.
  throw lastErr;
}

/**
 * Variant for Supabase-style `{ data, error }` responses that don't throw.
 * Treats `error` as failure and lets `retryWithBackoff` apply the policy.
 */
export async function retrySupabaseCall<T>(
  call: (attempt: number) => Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
  opts: RetryOptions = {},
): Promise<{ data: T | null; attempts: number; totalMs: number }> {
  const result = await retryWithBackoff(async (attempt) => {
    const { data, error } = await call(attempt);
    if (error) {
      const e = new Error(error.message);
      (e as any).code = error.code;
      throw e;
    }
    return data;
  }, opts);
  return { data: result.value, attempts: result.attempts, totalMs: result.totalMs };
}
