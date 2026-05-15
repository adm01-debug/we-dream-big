/**
 * Testes do cache em memória para entidades imutáveis-ish
 * (categories / suppliers / material_types).
 *
 * Cobre: cache hit/miss, hit parcial, TTL, dedupe batch (INFLIGHT),
 * piggyback por id (INFLIGHT_BY_ID), erros silenciados, isolamento
 * entre entities, invalidação e helpers síncronos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do bridge ANTES do import do módulo sob teste.
vi.mock('@/lib/external-db/bridge', () => {
  const invokeExternalDb = vi.fn();
  return { invokeExternalDb };
});

import { invokeExternalDb } from '@/lib/external-db/bridge';
import {
  getCachedByIds,
  getCachedById,
  invalidateImmutableCache,
  getFreshFromCacheSafe,
  putInCacheSafe,
  immutableCacheStats,
} from '@/lib/external-db/immutableCache';

const mockInvoke = invokeExternalDb as unknown as ReturnType<typeof vi.fn>;

/** Helper: cria deferred promise para controlar ordem de resolução. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockInvoke.mockReset();
  invalidateImmutableCache(); // limpa tudo
});

afterEach(() => {
  vi.useRealTimers();
});

describe('immutableCache.getCachedByIds — básico', () => {
  it('cache miss puro: 1 chamada bridge com filtro id=in.(...)', async () => {
    mockInvoke.mockResolvedValueOnce({
      records: [
        { id: 'a', name: 'Cat A' },
        { id: 'b', name: 'Cat B' },
        { id: 'c', name: 'Cat C' },
      ],
    });

    const map = await getCachedByIds('categories', ['a', 'b', 'c']);
    expect(map.size).toBe(3);
    expect(map.get('a')?.name).toBe('Cat A');
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    const arg = mockInvoke.mock.calls[0][0];
    expect(arg.table).toBe('categories');
    expect(arg.operation).toBe('select');
    expect(arg.filters.id).toBe('in.(a,b,c)');
  });

  it('cache hit puro: 0 chamadas bridge', async () => {
    mockInvoke.mockResolvedValueOnce({
      records: [{ id: 'a', name: 'Cat A' }],
    });
    await getCachedByIds('categories', ['a']);
    mockInvoke.mockClear();

    const map = await getCachedByIds('categories', ['a']);
    expect(map.get('a')?.name).toBe('Cat A');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('hit parcial: bridge é chamada só com os ids faltantes', async () => {
    mockInvoke.mockResolvedValueOnce({
      records: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    });
    await getCachedByIds('suppliers', ['a', 'b']);
    mockInvoke.mockClear();

    mockInvoke.mockResolvedValueOnce({
      records: [{ id: 'c', name: 'C', code: 'C-01' }],
    });
    const map = await getCachedByIds('suppliers', ['a', 'b', 'c']);

    expect(map.size).toBe(3);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0].filters.id).toBe('in.(c)');
  });

  it('TTL: após 5min+1s o cache expira e refaz fetch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'x', name: 'X' }] });
    await getCachedByIds('material_types', ['x']);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // ainda dentro do TTL
    vi.advanceTimersByTime(4 * 60 * 1000);
    await getCachedByIds('material_types', ['x']);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // expirou
    vi.advanceTimersByTime(2 * 60 * 1000);
    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'x', name: 'X-novo' }] });
    const map = await getCachedByIds('material_types', ['x']);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(map.get('x')?.name).toBe('X-novo');
  });

  it('ids duplicados/vazios são deduplicados antes do fetch', async () => {
    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'a', name: 'A' }] });

    await getCachedByIds('categories', ['', 'a', 'a', null as unknown as string, 'a']);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0].filters.id).toBe('in.(a)');
  });

  it('isolamento entre entities: id "x" em categories não serve suppliers', async () => {
    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'x', name: 'Cat X' }] });
    await getCachedByIds('categories', ['x']);

    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'x', name: 'Sup X', code: 'SX' }] });
    const sup = await getCachedByIds('suppliers', ['x']);

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(sup.get('x')?.name).toBe('Sup X');
  });
});

describe('immutableCache.getCachedByIds — concorrência', () => {
  it('dedupe batch idêntico (INFLIGHT): 2 chamadas concorrentes → 1 fetch', async () => {
    const d = deferred<{ records: Array<{ id: string; name: string }> }>();
    mockInvoke.mockReturnValueOnce(d.promise);

    const p1 = getCachedByIds('categories', ['a', 'b']);
    const p2 = getCachedByIds('categories', ['a', 'b']);

    d.resolve({ records: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] });

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(m1.get('a')?.name).toBe('A');
    expect(m2.get('b')?.name).toBe('B');
  });

  it('piggyback por id (INFLIGHT_BY_ID): A=[a,b,c] em voo, B=[b,c,d] → 2º fetch só com [d]', async () => {
    const dA = deferred<{ records: Array<{ id: string; name: string }> }>();
    const dB = deferred<{ records: Array<{ id: string; name: string }> }>();
    mockInvoke
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);

    const pA = getCachedByIds('material_types', ['a', 'b', 'c']);
    // microtask gap para A registrar INFLIGHT_BY_ID antes de B chegar
    await Promise.resolve();
    const pB = getCachedByIds('material_types', ['b', 'c', 'd']);
    await Promise.resolve();

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke.mock.calls[1][0].filters.id).toBe('in.(d)');

    dA.resolve({ records: [
      { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' },
    ]});
    dB.resolve({ records: [{ id: 'd', name: 'D' }] });

    const [mA, mB] = await Promise.all([pA, pB]);
    expect(mA.size).toBe(3);
    expect(mB.size).toBe(3);
    expect(mB.get('b')?.name).toBe('B'); // veio de A via piggyback
    expect(mB.get('d')?.name).toBe('D');
  });

  it('piggyback misto com hit: A=[x,y] em voo + cached + B=[x,cached,z] → 2º fetch só com [z]', async () => {
    // pre-cache "cached"
    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'cached', name: 'Pre' }] });
    await getCachedByIds('categories', ['cached']);
    mockInvoke.mockReset();

    const dA = deferred<{ records: Array<{ id: string; name: string }> }>();
    const dB = deferred<{ records: Array<{ id: string; name: string }> }>();
    mockInvoke
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);

    const pA = getCachedByIds('categories', ['x', 'y']);
    await Promise.resolve();
    const pB = getCachedByIds('categories', ['x', 'cached', 'z']);
    await Promise.resolve();

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke.mock.calls[1][0].filters.id).toBe('in.(z)');

    dA.resolve({ records: [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }] });
    dB.resolve({ records: [{ id: 'z', name: 'Z' }] });

    const [, mB] = await Promise.all([pA, pB]);
    expect(mB.get('x')?.name).toBe('X');
    expect(mB.get('cached')?.name).toBe('Pre');
    expect(mB.get('z')?.name).toBe('Z');
  });
});

describe('immutableCache — robustez e helpers', () => {
  it('erro do bridge: resolve com map vazio para missing e não envenena cache', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('bridge boom'));
    const m1 = await getCachedByIds('suppliers', ['a']);
    expect(m1.size).toBe(0);

    // próxima tentativa deve refazer a chamada
    mockInvoke.mockResolvedValueOnce({ records: [{ id: 'a', name: 'A', code: 'X' }] });
    const m2 = await getCachedByIds('suppliers', ['a']);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(m2.get('a')?.name).toBe('A');
  });

  it('invalidateImmutableCache(entity) limpa só a entity alvo', async () => {
    mockInvoke
      .mockResolvedValueOnce({ records: [{ id: 'c1', name: 'C' }] })
      .mockResolvedValueOnce({ records: [{ id: 's1', name: 'S', code: 'X' }] });
    await getCachedByIds('categories', ['c1']);
    await getCachedByIds('suppliers', ['s1']);

    invalidateImmutableCache('categories');

    expect(getFreshFromCacheSafe('categories', 'c1')).toBeUndefined();
    expect(getFreshFromCacheSafe('suppliers', 's1')?.name).toBe('S');
  });

  it('putInCacheSafe + getCachedById sem rede', async () => {
    putInCacheSafe('material_types', { id: 'm1', name: 'Algodão' });
    const rec = await getCachedById('material_types', 'm1');
    expect(rec?.name).toBe('Algodão');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('putInCacheSafe ignora registros inválidos (sem id ou name)', async () => {
    putInCacheSafe('categories', { id: '', name: 'x' });
    putInCacheSafe('categories', { id: 'k', name: '' });
    expect(getFreshFromCacheSafe('categories', '')).toBeUndefined();
    expect(getFreshFromCacheSafe('categories', 'k')).toBeUndefined();
  });

  it('immutableCacheStats reflete contagens por entity', async () => {
    putInCacheSafe('categories', { id: 'a', name: 'A' });
    putInCacheSafe('categories', { id: 'b', name: 'B' });
    putInCacheSafe('suppliers', { id: 's', name: 'S', code: 'X' });

    const stats = immutableCacheStats();
    expect(stats.categories).toBe(2);
    expect(stats.suppliers).toBe(1);
    expect(stats.material_types).toBe(0);
  });
});
