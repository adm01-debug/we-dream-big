/**
 * Fixed CRM-DB tests — uses vi.hoisted for proper mock hoisting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInvoke } = vi.hoisted(() => {
  const mockInvoke = vi.fn();
  return { mockInvoke };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  invokeCrmDb, selectCrm, selectCrmById, searchCrm,
  insertCrm, updateCrm, deleteCrm, invokeCrmBatch,
} from '@/lib/crm-db';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('invokeCrmDb', () => {
  it('returns data on success', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: [{ id: '1' }] }, error: null });
    const result = await invokeCrmDb({ table: 'companies', operation: 'select' });
    expect(result.data).toEqual([{ id: '1' }]);
  });

  it('throws on edge function error (non-retryable)', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Not Found') });
    await expect(invokeCrmDb({ table: 'companies', operation: 'select' })).rejects.toThrow('CRM DB error');
  });

  it('throws on query error in data', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Table not found' }, error: null });
    await expect(invokeCrmDb({ table: 'xyz', operation: 'select' })).rejects.toThrow('CRM query error');
  });

  it('retries on retryable errors (502)', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: null, error: new Error('502 Bad Gateway') })
      .mockResolvedValueOnce({ data: { data: [{ id: '1' }] }, error: null });
    const result = await invokeCrmDb({ table: 'companies', operation: 'select' });
    expect(result.data).toEqual([{ id: '1' }]);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

describe('selectCrm', () => {
  it('returns array of records', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: [{ id: '1' }, { id: '2' }] }, error: null });
    const result = await selectCrm('companies');
    expect(result).toHaveLength(2);
  });

  it('returns empty array on null data', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: null }, error: null });
    const result = await selectCrm('companies');
    expect(result).toEqual([]);
  });
});

describe('selectCrmById', () => {
  it('returns single record', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: { id: '1', name: 'Test' } }, error: null });
    const result = await selectCrmById('companies', '1');
    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('returns null on 404', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('404 not found') });
    const result = await selectCrmById('companies', 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('searchCrm', () => {
  it('passes search params correctly', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: [{ id: '1' }] }, error: null });
    await searchCrm('companies', 'nome_fantasia', 'Acme');
    expect(mockInvoke).toHaveBeenCalledWith('crm-db-bridge', expect.objectContaining({
      body: expect.objectContaining({
        operation: 'search',
        search: { column: 'nome_fantasia', term: 'Acme' },
      }),
    }));
  });
});

describe('insertCrm', () => {
  it('returns inserted records', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: [{ id: 'new1' }] }, error: null });
    const result = await insertCrm('quotes', { client_name: 'Test' });
    expect(result).toEqual([{ id: 'new1' }]);
  });
});

describe('updateCrm', () => {
  it('passes id and data', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { data: [{ id: '1' }] }, error: null });
    await updateCrm('quotes', '1', { status: 'approved' });
    expect(mockInvoke).toHaveBeenCalledWith('crm-db-bridge', expect.objectContaining({
      body: expect.objectContaining({ operation: 'update', id: '1', data: { status: 'approved' } }),
    }));
  });
});

describe('deleteCrm', () => {
  it('calls with delete operation', async () => {
    mockInvoke.mockResolvedValueOnce({ data: {}, error: null });
    await deleteCrm('quotes', '1');
    expect(mockInvoke).toHaveBeenCalledWith('crm-db-bridge', expect.objectContaining({
      body: expect.objectContaining({ operation: 'delete', id: '1' }),
    }));
  });
});

describe('invokeCrmBatch', () => {
  it('returns batch results', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, results: [{ success: true, data: { records: [], count: 0 } }] },
      error: null,
    });
    const results = await invokeCrmBatch([{ table: 'companies' }]);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('throws on batch failure', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: false, error: 'Batch failed' }, error: null });
    await expect(invokeCrmBatch([{ table: 'companies' }])).rejects.toThrow('Batch failed');
  });
});
