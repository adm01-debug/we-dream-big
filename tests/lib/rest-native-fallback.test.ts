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
import { dbInvoke } from '@/lib/external-db/rest-native';
import { reportSilentEmpty } from '@/lib/external-db/silent-empty-report';

// Mock silent-empty-report
vi.mock('@/lib/external-db/silent-empty-report', () => ({
  reportSilentEmpty: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('rest-native fallback and 410 handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report gone_410 when PostgREST returns 410 Gone', async () => {
    const mockError = { message: 'PGRST410: Gone' };
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({ data: null, error: mockError, count: null }));
      }),
    };

    (mockFrom as any).mockReturnValue(mockQuery);

    await dbInvoke({ table: 'products', operation: 'select' });

    expect(reportSilentEmpty).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'gone_410',
      table: 'products',
      operation: 'select'
    }));
  });

  it('should return data correctly on success', async () => {
    const mockData = [{ id: '1' }];
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        return Promise.resolve(callback({ data: mockData, error: null, count: 1 }));
      }),
    };

    (mockFrom as any).mockReturnValue(mockQuery);

    const result = await dbInvoke({ table: 'products', operation: 'select' });

    expect(result.data).toEqual({ records: mockData, count: 1 });
    expect(reportSilentEmpty).not.toHaveBeenCalled();
  });
});
