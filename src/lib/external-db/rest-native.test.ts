/**
 * Tests for the A1+A2 hardening of the REST-native fast path.
 *
 * A1 — `_search` on a whitelisted table WITHOUT a configured search column must no
 *      longer (a) make the table ineligible (silent empty) nor (b) fall back to
 *      `ilike('name', …)` (400 on tables without a `name` column). It must serve the
 *      base query and skip the search.
 * A2 — an empty-array filter (`coluna IN ()`) must short-circuit to an empty result
 *      WITHOUT hitting the network, instead of emitting the `['__no_match__']`
 *      sentinel that 400s on uuid/integer columns.
 *
 * The Supabase client is mocked with a chainable query builder that records every
 * call, so we can assert exactly which operators were applied (and whether the
 * network was touched at all).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => {
  const calls: { method: string; args: unknown[] }[] = [];
  const state: {
    result: { data: unknown[] | null; error: { message: string } | null; count: number | null };
  } = { result: { data: [], error: null, count: null } };
  return { calls, state };
});

vi.mock('@/integrations/supabase/client', () => {
  const methods = [
    'select', 'eq', 'in', 'is', 'gte', 'lte', 'gt', 'lt',
    'like', 'ilike', 'neq', 'not', 'order', 'range',
  ];
  const makeBuilder = () => {
    const b: Record<string, unknown> = {};
    for (const m of methods) {
      b[m] = (...args: unknown[]) => {
        h.calls.push({ method: m, args });
        return b;
      };
    }
    // Thenable: resolves with the canned result when awaited.
    (b as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(h.state.result);
    return b;
  };
  return {
    supabase: {
      from: (...args: unknown[]) => {
        h.calls.push({ method: 'from', args });
        return makeBuilder();
      },
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logger: { warn: () => {}, debug: () => {}, info: () => {}, error: () => {} },
}));
vi.mock('./silent-empty-report', () => ({ reportSilentEmpty: () => {} }));
vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  recordBridgeCall: () => {},
  estimatePayloadBytes: () => 0,
}));
vi.mock('@/lib/telemetry/requestId', () => ({ newRequestId: () => 'test-req' }));

// Imported AFTER the mocks are registered.
import { executeRestNativeSelect, isRestNativeEligible } from './rest-native';
import type { InvokeOptions } from './bridge';

const opt = (o: Partial<InvokeOptions> & { table: string }): InvokeOptions =>
  ({ operation: 'select', ...o }) as InvokeOptions;

const called = (method: string) => h.calls.some((c) => c.method === method);
const find = (method: string) => h.calls.find((c) => c.method === method);

beforeEach(() => {
  h.calls.length = 0;
  h.state.result = { data: [], error: null, count: null };
});

describe('isRestNativeEligible', () => {
  it('whitelisted table is eligible even without a search column', () => {
    expect(isRestNativeEligible(opt({ table: 'product_images', filters: { _search: 'x' } }))).toBe(true);
  });

  it('whitelisted table is eligible without filters', () => {
    expect(isRestNativeEligible(opt({ table: 'products' }))).toBe(true);
  });

  it('non-whitelisted table is ineligible', () => {
    expect(isRestNativeEligible(opt({ table: 'secret_internal_table' }))).toBe(false);
  });

  it('non-select operation is ineligible', () => {
    expect(isRestNativeEligible(opt({ table: 'products', operation: 'insert' }))).toBe(false);
  });
});

describe('executeRestNativeSelect — A1 (_search best-effort)', () => {
  it('applies ilike on products (regression — dominant live path)', async () => {
    await executeRestNativeSelect(opt({ table: 'products', filters: { _search: 'abc' } }));
    const ilike = find('ilike');
    expect(ilike).toBeTruthy();
    expect(ilike?.args[0]).toBe('name'); // resolved via v_products_public
    expect(ilike?.args[1]).toBe('%abc%');
  });

  it('skips ilike on a whitelisted table WITHOUT a search column, but runs the base query', async () => {
    await executeRestNativeSelect(
      opt({ table: 'product_images', filters: { _search: 'abc', product_id: '11111111-1111-1111-1111-111111111111' } }),
    );
    expect(called('ilike')).toBe(false); // no 400-prone ilike('name')
    expect(called('from')).toBe(true);   // base query still ran
    expect(called('eq')).toBe(true);     // the real product_id filter applied
  });

  it('treats empty/whitespace _search as no search', async () => {
    await executeRestNativeSelect(opt({ table: 'products', filters: { _search: '   ' } }));
    expect(called('ilike')).toBe(false);
    expect(called('from')).toBe(true);
  });

  it('treats a non-string _search as no search', async () => {
    await executeRestNativeSelect(opt({ table: 'products', filters: { _search: 42 as unknown as string } }));
    expect(called('ilike')).toBe(false);
    expect(called('from')).toBe(true);
  });
});

describe('executeRestNativeSelect — A2 (empty-array filter)', () => {
  it('short-circuits to empty WITHOUT touching the network', async () => {
    const res = await executeRestNativeSelect(opt({ table: 'products', filters: { category_id: [] } }));
    expect(res).toEqual({ records: [], count: 0 });
    expect(called('from')).toBe(false);
  });

  it('empty-array filter takes precedence over _search (F4)', async () => {
    const res = await executeRestNativeSelect(
      opt({ table: 'products', filters: { _search: 'abc', category_id: [] } }),
    );
    expect(res).toEqual({ records: [], count: 0 });
    expect(h.calls.length).toBe(0); // neither ilike nor from
  });

  it('non-empty array still queries with .in', async () => {
    await executeRestNativeSelect(opt({ table: 'products', filters: { category_id: ['a', 'b'] } }));
    const inCall = find('in');
    expect(inCall).toBeTruthy();
    expect(inCall?.args[0]).toBe('category_id');
    expect(inCall?.args[1]).toEqual(['a', 'b']);
    expect(called('from')).toBe(true);
  });

  it('does NOT misread _search:[] as an empty-array column filter (F3)', async () => {
    const res = await executeRestNativeSelect(
      opt({ table: 'products', filters: { _search: [] as unknown as string } }),
    );
    // _search:[] → non-string → no search; after removing it there is no column
    // filter left, so this is a normal base query, NOT a short-circuit.
    expect(res).toEqual({ records: [], count: null });
    expect(called('from')).toBe(true);
    expect(called('ilike')).toBe(false);
  });
});
