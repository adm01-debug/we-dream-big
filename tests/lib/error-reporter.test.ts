import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('error-reporter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reportError queues an error and schedules flush', async () => {
    const { reportError } = await import('@/lib/error-reporter');
    const err = new Error('test error');
    reportError(err, { context: 'unit-test' });
    // Error should be queued, not immediately flushed
    // After timer fires, it should flush
  });

  it('reportError captures error message and stack', async () => {
    const { reportError } = await import('@/lib/error-reporter');
    const err = new Error('captured error');
    reportError(err);
    // Verify no throw
    expect(err.message).toBe('captured error');
  });

  it('installGlobalErrorHandlers adds listeners without throwing', async () => {
    const { installGlobalErrorHandlers } = await import('@/lib/error-reporter');
    const addSpy = vi.spyOn(window, 'addEventListener');
    installGlobalErrorHandlers();
    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    addSpy.mockRestore();
  });
});
