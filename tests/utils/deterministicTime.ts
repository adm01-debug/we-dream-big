/**
 * deterministicTime — shared test helper for time-sensitive assertions.
 *
 * Mocks `Date.now()` and `performance.now()` so every elapsed-ms / cacheAge
 * assertion in the notifications suite is reproducible to the millisecond.
 *
 * IMPORTANT: This helper does NOT install Vitest fake timers, because doing so
 * breaks `@testing-library/react`'s `waitFor` (which polls via setTimeout).
 * If a test also needs fake timers (e.g. for debounced effects), call
 * `vi.useFakeTimers({ now: clock.now() })` AFTER `installDeterministicClock()`
 * and drive both surfaces in lockstep with `clock.tickAsync(ms)`.
 *
 * Usage (clock only, real timers — works with `waitFor`):
 *   const clock = installDeterministicClock(EPOCH);
 *   afterEach(() => clock.uninstall());
 *   clock.advance(25); // bumps Date.now() and performance.now() by 25ms
 *
 * Usage (clock + fake timers, for debounce-driven tests):
 *   const clock = installDeterministicClock(EPOCH);
 *   vi.useFakeTimers({ now: clock.now(), shouldAdvanceTime: false });
 *   await clock.tickAsync(200); // advances both clock + fake timers
 *   vi.useRealTimers();
 *   clock.uninstall();
 */
import { vi } from "vitest";

export interface DeterministicClock {
  /** Current mocked time (ms since epoch). */
  now(): number;
  /** Advance Date.now / performance.now WITHOUT firing timers. */
  advance(ms: number): void;
  /**
   * Advance the clock AND fake timers (must have been installed by caller).
   * Flushes microtasks afterwards. No-op against fake timers if real timers
   * are active, but the clock will still move.
   */
  tickAsync(ms: number): Promise<void>;
  /** Reset the clock to a specific timestamp. */
  reset(at?: number): void;
  /** Restore real Date.now / performance.now. */
  uninstall(): void;
}

export function installDeterministicClock(startAt: number = 0): DeterministicClock {
  let current = startAt;

  const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => current);
  const perfSpy = vi.spyOn(globalThis.performance, "now").mockImplementation(() => current);

  return {
    now: () => current,

    advance(ms: number) {
      current += ms;
    },

    async tickAsync(ms: number) {
      current += ms;
      // If fake timers are installed, sync them and advance.
      try {
        vi.setSystemTime(current);
        await vi.advanceTimersByTimeAsync(ms);
      } catch {
        // Real timers active — nothing more to do.
      }
      await Promise.resolve();
      await Promise.resolve();
    },

    reset(at: number = startAt) {
      current = at;
    },

    uninstall() {
      dateSpy.mockRestore();
      perfSpy.mockRestore();
    },
  };
}
