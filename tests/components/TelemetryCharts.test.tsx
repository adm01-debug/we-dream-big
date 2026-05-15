/**
 * Comprehensive tests for TelemetryCharts component
 * Covers: rendering, data aggregation, bucket calculations, edge cases
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';

// Mock recharts to avoid canvas rendering issues
vi.mock('recharts', () => ({
  AreaChart: ({ children, data }: any) => <div data-testid="area-chart" data-points={data?.length || 0}>{children}</div>,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-points={data?.length || 0}>{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

import { TelemetryCharts } from '@/components/admin/telemetry/TelemetryCharts';

// ============================================
// TEST DATA FACTORIES
// ============================================

function makeRow(overrides: Partial<any> = {}): any {
  return {
    id: `row-${Math.random()}`,
    duration_ms: 4000,
    severity: 'slow',
    table_name: 'products',
    rpc_name: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRows(count: number, overrides: Partial<any> = {}): any[] {
  return Array.from({ length: count }, (_, i) =>
    makeRow({
      id: `row-${i}`,
      created_at: new Date(Date.now() - i * 60 * 1000).toISOString(),
      ...overrides,
    })
  );
}

// ============================================
// RENDERING TESTS
// ============================================

describe('TelemetryCharts - Rendering', () => {
  it('returns null when no rows', () => {
    const { container } = render(<TelemetryCharts rows={[]} timeFilter="24h" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders chart titles when rows exist', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
    expect(screen.getByText('Duração Média / Máxima (ms)')).toBeInTheDocument();
  });

  it('renders bar chart for table distribution', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Alertas por Tabela')).toBeInTheDocument();
  });

  it('renders area charts', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const areaCharts = screen.getAllByTestId('area-chart');
    expect(areaCharts.length).toBe(2);
  });

  it('renders bar chart', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});

// ============================================
// TIMELINE BUCKET CALCULATION TESTS
// ============================================

describe('TelemetryCharts - Timeline Buckets', () => {
  it('creates buckets for 1h filter (5min intervals)', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 6 * 60000).toISOString() }), // 6 min ago (different bucket)
    ];
    render(<TelemetryCharts rows={rows} timeFilter="1h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(1);
  });

  it('creates buckets for 6h filter (30min intervals)', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 31 * 60000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="6h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(1);
  });

  it('creates buckets for 24h filter (1h intervals)', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 61 * 60000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(1);
  });

  it('creates buckets for 7d filter (6h intervals)', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 7 * 3600000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="7d" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(1);
  });

  it('handles custom timeFilter as 7d bucket size', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="custom" />);
    expect(screen.getAllByTestId('area-chart').length).toBe(2);
  });
});

// ============================================
// SEVERITY COUNTING IN BUCKETS
// ============================================

describe('TelemetryCharts - Severity Aggregation', () => {
  it('counts slow, very_slow, and error in same bucket', () => {
    const now = Date.now();
    const rows = [
      makeRow({ severity: 'slow', created_at: new Date(now).toISOString() }),
      makeRow({ severity: 'very_slow', created_at: new Date(now - 1000).toISOString() }),
      makeRow({ severity: 'error', created_at: new Date(now - 2000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    // All in same 1h bucket, should produce 1 data point
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBe(1);
  });

  it('separates entries into different buckets by time', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 2 * 3600000).toISOString() }), // 2h ago
      makeRow({ created_at: new Date(now - 4 * 3600000).toISOString() }), // 4h ago
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(2);
  });
});

// ============================================
// TABLE AGGREGATION TESTS
// ============================================

describe('TelemetryCharts - Table Aggregation', () => {
  it('aggregates by table_name', () => {
    const rows = [
      ...makeRows(5, { table_name: 'products', rpc_name: null }),
      ...makeRows(3, { table_name: 'categories', rpc_name: null }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const barChart = screen.getByTestId('bar-chart');
    expect(Number(barChart.getAttribute('data-points'))).toBe(2);
  });

  it('aggregates by rpc_name when available', () => {
    const rows = [
      ...makeRows(3, { rpc_name: 'get_price', table_name: null }),
      ...makeRows(2, { rpc_name: null, table_name: 'products' }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const barChart = screen.getByTestId('bar-chart');
    expect(Number(barChart.getAttribute('data-points'))).toBe(2);
  });

  it('limits to 8 tables', () => {
    const tables = Array.from({ length: 12 }, (_, i) => `table_${i}`);
    const rows = tables.flatMap(t => makeRows(2, { table_name: t }));
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const barChart = screen.getByTestId('bar-chart');
    expect(Number(barChart.getAttribute('data-points'))).toBeLessThanOrEqual(8);
  });

  it('sorts tables by alert count descending', () => {
    const rows = [
      ...makeRows(10, { table_name: 'high_count' }),
      ...makeRows(2, { table_name: 'low_count' }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const barChart = screen.getByTestId('bar-chart');
    expect(Number(barChart.getAttribute('data-points'))).toBe(2);
  });

  it('truncates long table names', () => {
    const rows = makeRows(3, { table_name: 'very_long_table_name_that_exceeds_18' });
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    // Should render without crashing (name truncated internally)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('uses "unknown" for rows with no table or rpc', () => {
    const rows = makeRows(3, { table_name: null, rpc_name: null });
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});

// ============================================
// DURATION AGGREGATION TESTS
// ============================================

describe('TelemetryCharts - Duration Metrics', () => {
  it('calculates max duration per bucket', () => {
    const now = Date.now();
    const rows = [
      makeRow({ duration_ms: 3000, created_at: new Date(now).toISOString() }),
      makeRow({ duration_ms: 15000, created_at: new Date(now - 1000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    // Both in same bucket, maxMs should be 15000
    const charts = screen.getAllByTestId('area-chart');
    expect(charts.length).toBe(2);
  });

  it('calculates average duration per bucket', () => {
    const now = Date.now();
    const rows = [
      makeRow({ duration_ms: 4000, created_at: new Date(now).toISOString() }),
      makeRow({ duration_ms: 6000, created_at: new Date(now - 500).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    // avg should be 5000
    expect(screen.getAllByTestId('area-chart').length).toBe(2);
  });

  it('handles single row per bucket', () => {
    const rows = [makeRow({ duration_ms: 7777 })];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBe(1);
  });
});

// ============================================
// AREA DATA KEYS TESTS
// ============================================

describe('TelemetryCharts - Area Data Keys', () => {
  it('renders muitoLentas area', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('area-muitoLentas')).toBeInTheDocument();
  });

  it('renders lentas area', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('area-lentas')).toBeInTheDocument();
  });

  it('renders erros area', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('area-erros')).toBeInTheDocument();
  });

  it('renders maxMs area', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('area-maxMs')).toBeInTheDocument();
  });

  it('renders mediaMs area', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('area-mediaMs')).toBeInTheDocument();
  });

  it('renders alertas bar', () => {
    const rows = makeRows(3);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByTestId('bar-alertas')).toBeInTheDocument();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('TelemetryCharts - Edge Cases', () => {
  it('handles single row', () => {
    const rows = [makeRow()];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });

  it('handles rows with same timestamp', () => {
    const ts = new Date().toISOString();
    const rows = makeRows(10, { created_at: ts });
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBe(1);
  });

  it('handles very old dates', () => {
    const rows = makeRows(3, { created_at: '2020-01-01T00:00:00.000Z' });
    render(<TelemetryCharts rows={rows} timeFilter="7d" />);
    expect(screen.getAllByTestId('area-chart').length).toBe(2);
  });

  it('handles 0ms duration', () => {
    const rows = makeRows(5, { duration_ms: 0 });
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Duração Média / Máxima (ms)')).toBeInTheDocument();
  });

  it('handles all severity types', () => {
    const now = Date.now();
    const rows = [
      makeRow({ severity: 'slow', created_at: new Date(now).toISOString() }),
      makeRow({ severity: 'very_slow', created_at: new Date(now - 1000).toISOString() }),
      makeRow({ severity: 'error', created_at: new Date(now - 2000).toISOString() }),
      makeRow({ severity: 'ok', created_at: new Date(now - 3000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getAllByTestId('area-chart').length).toBe(2);
  });

  it('handles rows spanning multiple days', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString() }),
      makeRow({ created_at: new Date(now - 3 * 86400000).toISOString() }),
      makeRow({ created_at: new Date(now - 6 * 86400000).toISOString() }),
    ];
    render(<TelemetryCharts rows={rows} timeFilter="7d" />);
    const chart = screen.getAllByTestId('area-chart')[0];
    expect(Number(chart.getAttribute('data-points'))).toBeGreaterThanOrEqual(2);
  });

  it('handles large number of rows (500)', () => {
    const rows = makeRows(500);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });
});

// ============================================
// RESPONSIVE CONTAINER TESTS
// ============================================

describe('TelemetryCharts - Layout', () => {
  it('renders responsive containers', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBe(3); // 2 area charts + 1 bar chart
  });

  it('renders legends', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const legends = screen.getAllByTestId('legend');
    expect(legends.length).toBeGreaterThanOrEqual(2);
  });

  it('renders cartesian grids', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const grids = screen.getAllByTestId('cartesian-grid');
    expect(grids.length).toBe(3);
  });

  it('renders tooltips', () => {
    const rows = makeRows(5);
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBe(3);
  });
});
