import { describe, it, expect } from 'vitest';
import {
  CACHE_TIMES, GC_TIMES, QUERY_KEY_PREFIXES,
  getStaleTimeForKey, getGcTimeForKey, createQueryClient,
  TECNICAS_QUERY_OPTIONS, TABELAS_PRECO_QUERY_OPTIONS,
  PRODUTOS_QUERY_OPTIONS, STABLE_DATA_QUERY_OPTIONS,
} from '@/lib/query-config';

describe('CACHE_TIMES', () => {
  it('should have increasing cache durations', () => {
    expect(CACHE_TIMES.NONE).toBe(0);
    expect(CACHE_TIMES.REALTIME).toBeLessThan(CACHE_TIMES.DYNAMIC);
    expect(CACHE_TIMES.DYNAMIC).toBeLessThan(CACHE_TIMES.PRODUTOS);
    expect(CACHE_TIMES.PRODUTOS).toBeLessThan(CACHE_TIMES.TABELAS_PRECO);
    expect(CACHE_TIMES.TABELAS_PRECO).toBeLessThan(CACHE_TIMES.TECNICAS);
    expect(CACHE_TIMES.TECNICAS).toBeLessThan(CACHE_TIMES.STABLE);
    expect(CACHE_TIMES.STABLE).toBeLessThan(CACHE_TIMES.VERY_STABLE);
  });
});

describe('getStaleTimeForKey', () => {
  it('should return TECNICAS time for tecnicas keys', () => {
    expect(getStaleTimeForKey(['tecnicas-unificadas', 'list'])).toBe(CACHE_TIMES.TECNICAS);
  });

  it('should return TABELAS_PRECO time for price table keys', () => {
    expect(getStaleTimeForKey(['tabelas-preco', 'id'])).toBe(CACHE_TIMES.TABELAS_PRECO);
  });

  it('should return STABLE for categories', () => {
    expect(getStaleTimeForKey(['categories'])).toBe(CACHE_TIMES.STABLE);
  });

  it('should return VERY_STABLE for colors', () => {
    expect(getStaleTimeForKey(['colors'])).toBe(CACHE_TIMES.VERY_STABLE);
  });

  it('should return default PRODUTOS for non-string keys', () => {
    expect(getStaleTimeForKey([123])).toBe(CACHE_TIMES.PRODUTOS);
  });

  it('should return default for unknown keys', () => {
    expect(getStaleTimeForKey(['random-key'])).toBe(CACHE_TIMES.PRODUTOS);
  });
});

describe('getGcTimeForKey', () => {
  it('should return TECNICAS gc time for tecnicas keys', () => {
    expect(getGcTimeForKey(['tecnicas-unificadas'])).toBe(GC_TIMES.TECNICAS);
  });

  it('should return default gc time for other keys', () => {
    expect(getGcTimeForKey(['products'])).toBe(GC_TIMES.DEFAULT);
  });
});

describe('createQueryClient', () => {
  it('should create a valid QueryClient', () => {
    const client = createQueryClient();
    expect(client).toBeDefined();
    expect(client.getDefaultOptions()).toBeDefined();
  });
});

describe('query option presets', () => {
  it('TECNICAS_QUERY_OPTIONS should disable refetch on focus and mount', () => {
    expect(TECNICAS_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
    expect(TECNICAS_QUERY_OPTIONS.refetchOnMount).toBe(false);
  });

  it('TABELAS_PRECO_QUERY_OPTIONS should have correct staleTime', () => {
    expect(TABELAS_PRECO_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.TABELAS_PRECO);
  });

  it('PRODUTOS_QUERY_OPTIONS should disable refetch on focus', () => {
    expect(PRODUTOS_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
  });

  it('STABLE_DATA_QUERY_OPTIONS should have longer staleTime', () => {
    expect(STABLE_DATA_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.STABLE);
  });
});
