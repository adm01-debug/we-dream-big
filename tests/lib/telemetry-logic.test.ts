/**
 * Pure logic tests for telemetry calculations
 * Tests: time thresholds, severity classification, offender ranking,
 * format helpers, CSV/PDF data preparation, bucket aggregation
 */
import { describe, it, expect } from 'vitest';

// ============================================
// REPLICATE PURE LOGIC FROM PAGE
// ============================================

// Time threshold calculation
function getTimeThreshold(
  timeFilter: string,
  customDateFrom?: Date,
  customDateTo?: Date
): { from: string; to: string } {
  const now = new Date();
  if (timeFilter === 'custom' && customDateFrom) {
    const from = new Date(customDateFrom);
    from.setHours(0, 0, 0, 0);
    const to = customDateTo ? new Date(customDateTo) : new Date();
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  let ms = 24 * 60 * 60 * 1000;
  switch (timeFilter) {
    case '1h': ms = 60 * 60 * 1000; break;
    case '6h': ms = 6 * 60 * 60 * 1000; break;
    case '24h': ms = 24 * 60 * 60 * 1000; break;
    case '7d': ms = 7 * 24 * 60 * 60 * 1000; break;
  }
  return { from: new Date(now.getTime() - ms).toISOString(), to: now.toISOString() };
}

// Format duration
function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

// Severity badge classification
function classifySeverity(durationMs: number, hasError: boolean): string {
  if (hasError) return 'error';
  if (durationMs >= 8000) return 'very_slow';
  if (durationMs >= 3000) return 'slow';
  return 'ok';
}

// Top offenders calculation
interface TelemetryRow {
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  severity: string;
}

function calculateTopOffenders(rows: TelemetryRow[]): Array<[string, { count: number; totalMs: number; maxMs: number }]> {
  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || 'unknown';
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, {
      count: prev.count + 1,
      totalMs: prev.totalMs + r.duration_ms,
      maxMs: Math.max(prev.maxMs, r.duration_ms),
    });
  }
  return [...tableStats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);
}

// CSV row preparation
function prepareCSVRow(r: any): string[] {
  return [
    new Date(r.created_at).toLocaleString('pt-BR'),
    r.operation,
    r.table_name || r.rpc_name || '-',
    String(r.duration_ms),
    r.severity,
    r.record_count != null ? String(r.record_count) : '-',
    r.query_limit != null ? String(r.query_limit) : '-',
    r.query_offset != null ? String(r.query_offset) : '-',
    r.count_mode ?? '-',
    (r.error_message || '').replace(/"/g, '""'),
  ];
}

// Bucket time format
function formatBucketTime(ts: number, timeFilter: string): string {
  const d = new Date(ts);
  if (timeFilter === '7d') {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Timeline bucket calculation
function calculateBuckets(rows: TelemetryRow[], timeFilter: string) {
  const bucketMs = timeFilter === '1h' ? 5 * 60 * 1000
    : timeFilter === '6h' ? 30 * 60 * 1000
    : timeFilter === '24h' ? 60 * 60 * 1000
    : 6 * 60 * 60 * 1000;

  const buckets = new Map<number, { slow: number; very_slow: number; error: number; count: number; totalMs: number; maxMs: number }>();

  for (const r of rows) {
    const ts = new Date(r.created_at as any).getTime();
    const bucketKey = Math.floor(ts / bucketMs) * bucketMs;
    const prev = buckets.get(bucketKey) || { slow: 0, very_slow: 0, error: 0, count: 0, totalMs: 0, maxMs: 0 };
    prev.count++;
    prev.totalMs += r.duration_ms;
    prev.maxMs = Math.max(prev.maxMs, r.duration_ms);
    if (r.severity === 'slow') prev.slow++;
    if (r.severity === 'very_slow') prev.very_slow++;
    if (r.severity === 'error') prev.error++;
    buckets.set(bucketKey, prev);
  }

  return [...buckets.entries()].sort((a, b) => a[0] - b[0]);
}

// ============================================
// FORMAT DURATION TESTS
// ============================================

describe('formatDuration', () => {
  it('formats 0ms', () => expect(formatDuration(0)).toBe('0ms'));
  it('formats 1ms', () => expect(formatDuration(1)).toBe('1ms'));
  it('formats 999ms', () => expect(formatDuration(999)).toBe('999ms'));
  it('formats 1000ms as 1.0s', () => expect(formatDuration(1000)).toBe('1.0s'));
  it('formats 1500ms as 1.5s', () => expect(formatDuration(1500)).toBe('1.5s'));
  it('formats 3000ms as 3.0s', () => expect(formatDuration(3000)).toBe('3.0s'));
  it('formats 3500ms as 3.5s', () => expect(formatDuration(3500)).toBe('3.5s'));
  it('formats 8000ms as 8.0s', () => expect(formatDuration(8000)).toBe('8.0s'));
  it('formats 10000ms as 10.0s', () => expect(formatDuration(10000)).toBe('10.0s'));
  it('formats 15750ms as 15.8s', () => expect(formatDuration(15750)).toBe('15.8s'));
  it('formats 30000ms as 30.0s', () => expect(formatDuration(30000)).toBe('30.0s'));
  it('formats 60000ms as 60.0s', () => expect(formatDuration(60000)).toBe('60.0s'));
  it('formats 100ms', () => expect(formatDuration(100)).toBe('100ms'));
  it('formats 500ms', () => expect(formatDuration(500)).toBe('500ms'));
  it('formats negative as negative ms', () => expect(formatDuration(-100)).toBe('-100ms'));
  it('formats 1001ms as 1.0s', () => expect(formatDuration(1001)).toBe('1.0s'));
  it('formats 1050ms as 1.1s', () => expect(formatDuration(1050)).toBe('1.1s'));
  it('formats 1099ms as 1.1s', () => expect(formatDuration(1099)).toBe('1.1s'));
  it('formats 9999ms as 10.0s', () => expect(formatDuration(9999)).toBe('10.0s'));
  it('formats 99999ms as 100.0s', () => expect(formatDuration(99999)).toBe('100.0s'));
});

// ============================================
// SEVERITY CLASSIFICATION TESTS
// ============================================

describe('classifySeverity', () => {
  it('returns ok for fast queries', () => expect(classifySeverity(500, false)).toBe('ok'));
  it('returns ok at 2999ms', () => expect(classifySeverity(2999, false)).toBe('ok'));
  it('returns slow at 3000ms', () => expect(classifySeverity(3000, false)).toBe('slow'));
  it('returns slow at 5000ms', () => expect(classifySeverity(5000, false)).toBe('slow'));
  it('returns slow at 7999ms', () => expect(classifySeverity(7999, false)).toBe('slow'));
  it('returns very_slow at 8000ms', () => expect(classifySeverity(8000, false)).toBe('very_slow'));
  it('returns very_slow at 10000ms', () => expect(classifySeverity(10000, false)).toBe('very_slow'));
  it('returns very_slow at 30000ms', () => expect(classifySeverity(30000, false)).toBe('very_slow'));
  it('returns error when hasError is true regardless of duration', () => {
    expect(classifySeverity(100, true)).toBe('error');
    expect(classifySeverity(5000, true)).toBe('error');
    expect(classifySeverity(10000, true)).toBe('error');
  });
  it('returns ok at 0ms', () => expect(classifySeverity(0, false)).toBe('ok'));
});

// ============================================
// TIME THRESHOLD TESTS
// ============================================

describe('getTimeThreshold', () => {
  it('returns 1 hour range for 1h filter', () => {
    const { from, to } = getTimeThreshold('1h');
    const diff = new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBeCloseTo(60 * 60 * 1000, -3);
  });

  it('returns 6 hour range for 6h filter', () => {
    const { from, to } = getTimeThreshold('6h');
    const diff = new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBeCloseTo(6 * 60 * 60 * 1000, -3);
  });

  it('returns 24 hour range for 24h filter', () => {
    const { from, to } = getTimeThreshold('24h');
    const diff = new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });

  it('returns 7 day range for 7d filter', () => {
    const { from, to } = getTimeThreshold('7d');
    const diff = new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
  });

  it('returns custom range when both dates provided', () => {
    const from = new Date(2025, 0, 1);
    const to = new Date(2025, 0, 15);
    const result = getTimeThreshold('custom', from, to);
    const resultFrom = new Date(result.from);
    const resultTo = new Date(result.to);
    expect(resultFrom.getFullYear()).toBe(2025);
    expect(resultFrom.getMonth()).toBe(0);
    expect(resultFrom.getDate()).toBe(1);
    expect(resultFrom.getHours()).toBe(0);
    expect(resultTo.getDate()).toBe(15);
    expect(resultTo.getHours()).toBe(23);
    expect(resultTo.getMinutes()).toBe(59);
  });

  it('uses current date as "to" when only from is provided', () => {
    const from = new Date(2025, 0, 1);
    const result = getTimeThreshold('custom', from);
    const resultTo = new Date(result.to);
    const now = new Date();
    expect(resultTo.getDate()).toBe(now.getDate());
  });

  it('defaults to 24h when custom without dates', () => {
    const { from, to } = getTimeThreshold('custom');
    const diff = new Date(to).getTime() - new Date(from).getTime();
    expect(diff).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });

  it('sets from time to 00:00:00.000', () => {
    const from = new Date(2025, 5, 15, 14, 30, 45);
    const result = getTimeThreshold('custom', from);
    const resultFrom = new Date(result.from);
    expect(resultFrom.getHours()).toBe(0);
    expect(resultFrom.getMinutes()).toBe(0);
    expect(resultFrom.getSeconds()).toBe(0);
  });

  it('sets to time to 23:59:59.999', () => {
    const from = new Date(2025, 5, 15);
    const to = new Date(2025, 5, 20);
    const result = getTimeThreshold('custom', from, to);
    const resultTo = new Date(result.to);
    expect(resultTo.getHours()).toBe(23);
    expect(resultTo.getMinutes()).toBe(59);
    expect(resultTo.getSeconds()).toBe(59);
  });

  it('returns valid ISO strings', () => {
    const { from, to } = getTimeThreshold('24h');
    expect(() => new Date(from)).not.toThrow();
    expect(() => new Date(to)).not.toThrow();
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============================================
// TOP OFFENDERS TESTS
// ============================================

describe('calculateTopOffenders', () => {
  it('returns empty for empty rows', () => {
    expect(calculateTopOffenders([])).toEqual([]);
  });

  it('groups by table_name', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'products', rpc_name: null, duration_ms: 4000, severity: 'slow' },
      { table_name: 'products', rpc_name: null, duration_ms: 5000, severity: 'slow' },
      { table_name: 'categories', rpc_name: null, duration_ms: 3000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result.length).toBe(2);
    expect(result[0][0]).toBe('products');
    expect(result[0][1].count).toBe(2);
    expect(result[1][0]).toBe('categories');
    expect(result[1][1].count).toBe(1);
  });

  it('prefers rpc_name over table_name', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'products', rpc_name: 'get_price', duration_ms: 4000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result[0][0]).toBe('get_price');
  });

  it('uses "unknown" when both are null', () => {
    const rows: TelemetryRow[] = [
      { table_name: null, rpc_name: null, duration_ms: 4000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result[0][0]).toBe('unknown');
  });

  it('calculates max duration correctly', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'products', rpc_name: null, duration_ms: 3000, severity: 'slow' },
      { table_name: 'products', rpc_name: null, duration_ms: 12000, severity: 'very_slow' },
      { table_name: 'products', rpc_name: null, duration_ms: 5000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result[0][1].maxMs).toBe(12000);
  });

  it('calculates total duration correctly', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'products', rpc_name: null, duration_ms: 3000, severity: 'slow' },
      { table_name: 'products', rpc_name: null, duration_ms: 5000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result[0][1].totalMs).toBe(8000);
  });

  it('sorts by count descending', () => {
    const rows: TelemetryRow[] = [
      ...Array(3).fill(null).map(() => ({ table_name: 'a', rpc_name: null, duration_ms: 4000, severity: 'slow' })),
      ...Array(5).fill(null).map(() => ({ table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow' })),
      ...Array(1).fill(null).map(() => ({ table_name: 'c', rpc_name: null, duration_ms: 4000, severity: 'slow' })),
    ];
    const result = calculateTopOffenders(rows);
    expect(result[0][0]).toBe('b');
    expect(result[1][0]).toBe('a');
    expect(result[2][0]).toBe('c');
  });

  it('limits to 8 offenders', () => {
    const rows: TelemetryRow[] = Array.from({ length: 12 }, (_, i) => ({
      table_name: `table_${i}`, rpc_name: null, duration_ms: 4000, severity: 'slow',
    }));
    const result = calculateTopOffenders(rows);
    expect(result.length).toBe(8);
  });

  it('handles single row', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'products', rpc_name: null, duration_ms: 4000, severity: 'slow' },
    ];
    const result = calculateTopOffenders(rows);
    expect(result.length).toBe(1);
    expect(result[0][1].count).toBe(1);
    expect(result[0][1].maxMs).toBe(4000);
    expect(result[0][1].totalMs).toBe(4000);
  });

  it('handles 100 rows for same table', () => {
    const rows: TelemetryRow[] = Array.from({ length: 100 }, () => ({
      table_name: 'products', rpc_name: null, duration_ms: 4000, severity: 'slow',
    }));
    const result = calculateTopOffenders(rows);
    expect(result.length).toBe(1);
    expect(result[0][1].count).toBe(100);
    expect(result[0][1].totalMs).toBe(400000);
  });
});

// ============================================
// CSV ROW PREPARATION TESTS
// ============================================

describe('prepareCSVRow', () => {
  it('formats complete row', () => {
    const row = {
      created_at: '2025-01-15T10:30:00.000Z',
      operation: 'select',
      table_name: 'products',
      rpc_name: null,
      duration_ms: 4500,
      severity: 'slow',
      record_count: 200,
      query_limit: 200,
      query_offset: 0,
      count_mode: 'planned',
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[1]).toBe('select');
    expect(result[2]).toBe('products');
    expect(result[3]).toBe('4500');
    expect(result[4]).toBe('slow');
    expect(result[5]).toBe('200');
    expect(result[6]).toBe('200');
    expect(result[7]).toBe('0');
    expect(result[8]).toBe('planned');
    expect(result[9]).toBe('');
  });

  it('uses rpc_name when table_name is null', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: null,
      rpc_name: 'get_price',
      duration_ms: 4000,
      severity: 'slow',
      record_count: null,
      query_limit: null,
      query_offset: null,
      count_mode: null,
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[2]).toBe('get_price');
  });

  it('uses dash when both names null', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: null,
      rpc_name: null,
      duration_ms: 4000,
      severity: 'slow',
      record_count: null,
      query_limit: null,
      query_offset: null,
      count_mode: null,
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[2]).toBe('-');
  });

  it('shows dash for null record_count', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: 'products',
      rpc_name: null,
      duration_ms: 4000,
      severity: 'slow',
      record_count: null,
      query_limit: null,
      query_offset: null,
      count_mode: null,
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[5]).toBe('-');
  });

  it('escapes double quotes in error message', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: 'products',
      rpc_name: null,
      duration_ms: 15000,
      severity: 'error',
      record_count: null,
      query_limit: null,
      query_offset: null,
      count_mode: null,
      error_message: 'column "image_url" does not exist',
    };
    const result = prepareCSVRow(row);
    expect(result[9]).toBe('column ""image_url"" does not exist');
  });

  it('handles zero record count', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: 'products',
      rpc_name: null,
      duration_ms: 4000,
      severity: 'slow',
      record_count: 0,
      query_limit: 200,
      query_offset: 0,
      count_mode: 'exact',
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[5]).toBe('0');
  });

  it('handles zero offset', () => {
    const row = {
      created_at: new Date().toISOString(),
      operation: 'select',
      table_name: 'products',
      rpc_name: null,
      duration_ms: 4000,
      severity: 'slow',
      record_count: 200,
      query_limit: 200,
      query_offset: 0,
      count_mode: 'planned',
      error_message: null,
    };
    const result = prepareCSVRow(row);
    expect(result[7]).toBe('0');
  });
});

// ============================================
// BUCKET FORMAT TIME TESTS
// ============================================

describe('formatBucketTime', () => {
  it('formats as date for 7d filter', () => {
    const ts = new Date(2025, 0, 15, 10, 30).getTime();
    const result = formatBucketTime(ts, '7d');
    expect(result).toMatch(/15\/01/);
  });

  it('formats as time for 24h filter', () => {
    const ts = new Date(2025, 0, 15, 10, 30).getTime();
    const result = formatBucketTime(ts, '24h');
    expect(result).toMatch(/10:30/);
  });

  it('formats as time for 1h filter', () => {
    const ts = new Date(2025, 0, 15, 14, 15).getTime();
    const result = formatBucketTime(ts, '1h');
    expect(result).toMatch(/14:15/);
  });

  it('formats as time for 6h filter', () => {
    const ts = new Date(2025, 0, 15, 8, 0).getTime();
    const result = formatBucketTime(ts, '6h');
    expect(result).toMatch(/08:00/);
  });
});

// ============================================
// BUCKET CALCULATION TESTS
// ============================================

describe('calculateBuckets', () => {
  it('returns empty for empty rows', () => {
    expect(calculateBuckets([], '24h')).toEqual([]);
  });

  it('groups same-hour entries for 24h filter', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow', created_at: new Date(now - 1000).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result.length).toBe(1);
    expect(result[0][1].count).toBe(2);
  });

  it('separates different-hour entries for 24h filter', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow', created_at: new Date(now - 2 * 3600000).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result.length).toBe(2);
  });

  it('uses 5-minute buckets for 1h filter', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow', created_at: new Date(now - 6 * 60000).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '1h');
    expect(result.length).toBe(2); // Different 5-min buckets
  });

  it('counts severity types correctly', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 10000, severity: 'very_slow', created_at: new Date(now - 100).toISOString() },
      { table_name: 'c', rpc_name: null, duration_ms: 15000, severity: 'error', created_at: new Date(now - 200).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result[0][1].slow).toBe(1);
    expect(result[0][1].very_slow).toBe(1);
    expect(result[0][1].error).toBe(1);
  });

  it('calculates maxMs correctly per bucket', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 15000, severity: 'very_slow', created_at: new Date(now - 100).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result[0][1].maxMs).toBe(15000);
  });

  it('calculates totalMs correctly per bucket', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 5000, severity: 'slow', created_at: new Date(now - 100).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result[0][1].totalMs).toBe(8000);
  });

  it('sorts buckets by time ascending', () => {
    const now = Date.now();
    const rows = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow', created_at: new Date(now).toISOString() },
      { table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow', created_at: new Date(now - 3 * 3600000).toISOString() },
    ] as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result[0][0]).toBeLessThan(result[1][0]);
  });

  it('handles 500 rows', () => {
    const now = Date.now();
    const rows = Array.from({ length: 500 }, (_, i) => ({
      table_name: 'products', rpc_name: null, duration_ms: 4000 + i,
      severity: i % 3 === 0 ? 'slow' : i % 3 === 1 ? 'very_slow' : 'error',
      created_at: new Date(now - i * 60000).toISOString(),
    })) as any[];
    const result = calculateBuckets(rows, '24h');
    expect(result.length).toBeGreaterThan(0);
    const totalCount = result.reduce((sum, [, data]) => sum + data.count, 0);
    expect(totalCount).toBe(500);
  });
});

// ============================================
// STATS AGGREGATION TESTS
// ============================================

describe('Stats Aggregation', () => {
  function calcStats(rows: TelemetryRow[]) {
    const verySlow = rows.filter(r => r.severity === 'very_slow').length;
    const slow = rows.filter(r => r.severity === 'slow').length;
    const errors = rows.filter(r => r.severity === 'error').length;
    const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0;
    return { verySlow, slow, errors, avgDuration };
  }

  it('counts zero for empty rows', () => {
    const stats = calcStats([]);
    expect(stats.verySlow).toBe(0);
    expect(stats.slow).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.avgDuration).toBe(0);
  });

  it('counts only slow entries', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'a', rpc_name: null, duration_ms: 4000, severity: 'slow' },
      { table_name: 'b', rpc_name: null, duration_ms: 5000, severity: 'slow' },
    ];
    const stats = calcStats(rows);
    expect(stats.slow).toBe(2);
    expect(stats.verySlow).toBe(0);
    expect(stats.errors).toBe(0);
  });

  it('counts mixed severities', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'a', rpc_name: null, duration_ms: 4000, severity: 'slow' },
      { table_name: 'b', rpc_name: null, duration_ms: 10000, severity: 'very_slow' },
      { table_name: 'c', rpc_name: null, duration_ms: 15000, severity: 'error' },
      { table_name: 'd', rpc_name: null, duration_ms: 3000, severity: 'slow' },
    ];
    const stats = calcStats(rows);
    expect(stats.slow).toBe(2);
    expect(stats.verySlow).toBe(1);
    expect(stats.errors).toBe(1);
  });

  it('calculates correct average', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow' },
      { table_name: 'b', rpc_name: null, duration_ms: 5000, severity: 'slow' },
      { table_name: 'c', rpc_name: null, duration_ms: 4000, severity: 'slow' },
    ];
    const stats = calcStats(rows);
    expect(stats.avgDuration).toBe(4000);
  });

  it('rounds average to integer', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'a', rpc_name: null, duration_ms: 3000, severity: 'slow' },
      { table_name: 'b', rpc_name: null, duration_ms: 4000, severity: 'slow' },
    ];
    const stats = calcStats(rows);
    expect(stats.avgDuration).toBe(3500);
    expect(Number.isInteger(stats.avgDuration)).toBe(true);
  });

  it('handles single row', () => {
    const rows: TelemetryRow[] = [
      { table_name: 'a', rpc_name: null, duration_ms: 7777, severity: 'slow' },
    ];
    const stats = calcStats(rows);
    expect(stats.avgDuration).toBe(7777);
  });

  it('handles large dataset (1000 rows)', () => {
    const rows: TelemetryRow[] = Array.from({ length: 1000 }, (_, i) => ({
      table_name: 'products', rpc_name: null, duration_ms: 4000 + (i % 100),
      severity: i % 3 === 0 ? 'slow' : i % 3 === 1 ? 'very_slow' : 'error',
    }));
    const stats = calcStats(rows);
    expect(stats.slow + stats.verySlow + stats.errors).toBe(1000);
    expect(stats.avgDuration).toBeGreaterThan(4000);
  });
});
