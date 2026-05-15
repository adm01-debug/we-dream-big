import { describe, it, expect } from 'vitest';
import {
  CACHE_TIMES, GC_TIMES, QUERY_KEY_PREFIXES,
  getStaleTimeForKey, getGcTimeForKey,
  createQueryClient,
  TECNICAS_QUERY_OPTIONS, TABELAS_PRECO_QUERY_OPTIONS,
  PRODUTOS_QUERY_OPTIONS, STABLE_DATA_QUERY_OPTIONS,
} from '@/lib/query-config';

describe('CACHE_TIMES constants', () => {
  it('VERY_STABLE is 24 hours', () => {
    expect(CACHE_TIMES.VERY_STABLE).toBe(86400000);
  });
  it('STABLE is 1 hour', () => {
    expect(CACHE_TIMES.STABLE).toBe(3600000);
  });
  it('TECNICAS is 30 min', () => {
    expect(CACHE_TIMES.TECNICAS).toBe(1800000);
  });
  it('PRODUTOS is 10 min', () => {
    expect(CACHE_TIMES.PRODUTOS).toBe(600000);
  });
  it('NONE is 0', () => {
    expect(CACHE_TIMES.NONE).toBe(0);
  });
  it('REALTIME is 1 min', () => {
    expect(CACHE_TIMES.REALTIME).toBe(60000);
  });
});

describe('getStaleTimeForKey', () => {
  it('returns TECNICAS time for tecnicas key', () => {
    expect(getStaleTimeForKey(['tecnicas-unificadas', 'all'])).toBe(CACHE_TIMES.TECNICAS);
  });
  it('returns TABELAS_PRECO for tabelas key', () => {
    expect(getStaleTimeForKey(['tabelas-preco', 'xyz'])).toBe(CACHE_TIMES.TABELAS_PRECO);
  });
  it('returns STABLE for categories', () => {
    expect(getStaleTimeForKey(['categories'])).toBe(CACHE_TIMES.STABLE);
  });
  it('returns VERY_STABLE for colors', () => {
    expect(getStaleTimeForKey(['colors'])).toBe(CACHE_TIMES.VERY_STABLE);
  });
  it('returns PRODUTOS as default', () => {
    expect(getStaleTimeForKey(['unknown-key'])).toBe(CACHE_TIMES.PRODUTOS);
  });
  it('returns PRODUTOS for non-string key', () => {
    expect(getStaleTimeForKey([123])).toBe(CACHE_TIMES.PRODUTOS);
  });
});

describe('getGcTimeForKey', () => {
  it('returns TECNICAS gc for tecnicas key', () => {
    expect(getGcTimeForKey(['tecnicas-unificadas'])).toBe(GC_TIMES.TECNICAS);
  });
  it('returns DEFAULT for other keys', () => {
    expect(getGcTimeForKey(['other'])).toBe(GC_TIMES.DEFAULT);
  });
});

describe('createQueryClient', () => {
  it('creates a valid QueryClient', () => {
    const qc = createQueryClient();
    expect(qc).toBeDefined();
    expect(typeof qc.getQueryCache).toBe('function');
  });
});

describe('pre-configured options', () => {
  it('TECNICAS_QUERY_OPTIONS has correct staleTime', () => {
    expect(TECNICAS_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.TECNICAS);
    expect(TECNICAS_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
  });
  it('TABELAS_PRECO_QUERY_OPTIONS has correct staleTime', () => {
    expect(TABELAS_PRECO_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.TABELAS_PRECO);
  });
  it('PRODUTOS_QUERY_OPTIONS has correct staleTime', () => {
    expect(PRODUTOS_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.PRODUTOS);
  });
  it('STABLE_DATA_QUERY_OPTIONS has correct staleTime', () => {
    expect(STABLE_DATA_QUERY_OPTIONS.staleTime).toBe(CACHE_TIMES.STABLE);
  });
});
