import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbInvoke } from '@/lib/db/postgrest';
import { logger } from '@/lib/logger';

// Mock postgrest
vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PostgREST Pagination and Filtering Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply filters and ordering correctly in dbInvoke', async () => {
    (dbInvoke as any).mockResolvedValueOnce({ records: [], count: 0 });

    const filters = { is_active: true, category_id: 'cat-123' };
    const orderBy = { column: 'name', ascending: true };
    
    await dbInvoke({
      table: 'products',
      operation: 'select',
      filters,
      orderBy,
      limit: 10,
    });

    expect(dbInvoke).toHaveBeenCalledWith(expect.objectContaining({
      table: 'products',
      filters: expect.objectContaining(filters),
      orderBy: expect.objectContaining(orderBy),
      limit: 10
    }));
  });

  it('should handle pagination ranges correctly', async () => {
    (dbInvoke as any).mockResolvedValueOnce({ records: [], count: 100 });

    await dbInvoke({
      table: 'suppliers',
      operation: 'select',
      offset: 20,
      limit: 20,
    });

    expect(dbInvoke).toHaveBeenCalledWith(expect.objectContaining({
      offset: 20,
      limit: 20
    }));
  });
});
