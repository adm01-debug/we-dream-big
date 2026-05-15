import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all log methods', async () => {
    const { logger } = await import('@/lib/logger');
    expect(logger.log).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('logger.error should always log (even in production)', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('test error');
    // Logger prepends [ERROR] timestamp prefix
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/^\[ERROR\] .+$/),
      'test error'
    );
  });

  it('logger methods should accept multiple arguments', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('msg', { data: 1 }, [1, 2]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/^\[ERROR\] .+$/),
      'msg',
      { data: 1 },
      [1, 2]
    );
  });
});
