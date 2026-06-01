import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    __mockFrom: mockFrom,
  };
});

import { __mockFrom as mockFrom } from '@/integrations/supabase/client';
import { fetchPaginatedFromBridge } from '@/hooks/stock/stockFetcher';
import { logger } from '@/lib/logger';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

// Mock silent-empty-report
vi.mock('@/lib/external-db/silent-empty-report', () => ({
  reportSilentEmpty: vi.fn(),
}));

import { reportSilentEmpty } from '@/lib/external-db/silent-empty-report';

describe('stockFetcher - 410 Gone Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle 410 Gone error by reporting and stopping pagination', async () => {
    const mockError = {
      message: 'Edge function returned 410: Error, {"error":"Gone"}',
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({ data: null, error: mockError, count: null }));
      }),
    };

    (mockFrom as any).mockReturnValue(mockQuery);

    const result = await fetchPaginatedFromBridge('products', 'id', 10, 100);

    expect(result).toEqual([]);
    expect(reportSilentEmpty).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'gone_410',
      table: 'v_products_public',
      operation: 'select'
    }));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Bridge deprecated (410)'));
  });

  it('should continue loading data normally when no 410 error occurs', async () => {
    const mockData = [{ id: '1' }, { id: '2' }];
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({ data: mockData, error: null, count: 2 }));
      }),
    };

    (mockFrom as any).mockReturnValue(mockQuery);

    const result = await fetchPaginatedFromBridge('products', 'id', 10, 100);

    expect(result).toEqual(mockData);
    expect(reportSilentEmpty).not.toHaveBeenCalled();
  });
});
