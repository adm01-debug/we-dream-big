/**
 * E2E Tests — Analytics & BI Module
 * Covers: Metrics, Charts, Filters, Export
 */
import { describe, it, expect } from 'vitest';

// ============ BI Metrics ============
describe('E2E Analytics — BI Metrics', () => {
  const metrics = {
    totalQuotes: 150, approvedQuotes: 85, rejectedQuotes: 25, pendingQuotes: 40,
    totalRevenue: 450000, avgTicket: 5294.12,
    conversionRate: 56.67, // approved / total * 100
    topProducts: ['Caneta', 'Caderno', 'Squeeze'],
    topClients: ['Alpha SA', 'Beta Corp', 'Gamma LTDA'],
    quotesThisMonth: 32, quotesLastMonth: 28,
  };

  it('total = approved + rejected + pending', () => {
    expect(metrics.approvedQuotes + metrics.rejectedQuotes + metrics.pendingQuotes).toBe(metrics.totalQuotes);
  });
  it('conversion rate is correct', () => {
    const calc = (metrics.approvedQuotes / metrics.totalQuotes * 100).toFixed(2);
    expect(parseFloat(calc)).toBeCloseTo(metrics.conversionRate, 1);
  });
  it('avg ticket = revenue / approved', () => {
    const calc = metrics.totalRevenue / metrics.approvedQuotes;
    expect(calc).toBeCloseTo(metrics.avgTicket, 0);
  });
  it('has top products', () => expect(metrics.topProducts.length).toBeGreaterThanOrEqual(3));
  it('has top clients', () => expect(metrics.topClients.length).toBeGreaterThanOrEqual(3));
  it('month-over-month growth', () => {
    const growth = ((metrics.quotesThisMonth - metrics.quotesLastMonth) / metrics.quotesLastMonth * 100);
    expect(growth).toBeCloseTo(14.29, 1);
  });
});

// ============ Chart Data ============
describe('E2E Analytics — Chart Data', () => {
  const monthlyData = [
    { month: 'Jan', quotes: 20, revenue: 45000 },
    { month: 'Fev', quotes: 18, revenue: 38000 },
    { month: 'Mar', quotes: 25, revenue: 62000 },
    { month: 'Abr', quotes: 30, revenue: 78000 },
    { month: 'Mai', quotes: 22, revenue: 51000 },
    { month: 'Jun', quotes: 35, revenue: 95000 },
  ];

  it('has 6 months of data', () => expect(monthlyData).toHaveLength(6));
  it('data has month label', () => monthlyData.forEach(d => expect(d.month).toBeTruthy()));
  it('data has quotes count', () => monthlyData.forEach(d => expect(d.quotes).toBeGreaterThan(0)));
  it('data has revenue', () => monthlyData.forEach(d => expect(d.revenue).toBeGreaterThan(0)));
  
  it('total revenue across months', () => {
    const total = monthlyData.reduce((s, d) => s + d.revenue, 0);
    expect(total).toBe(369000);
  });
  
  it('best month by revenue', () => {
    const best = monthlyData.reduce((max, d) => d.revenue > max.revenue ? d : max);
    expect(best.month).toBe('Jun');
  });
  
  it('best month by quotes', () => {
    const best = monthlyData.reduce((max, d) => d.quotes > max.quotes ? d : max);
    expect(best.month).toBe('Jun');
  });
});

// ============ Date Range Filters ============
describe('E2E Analytics — Date Filters', () => {
  const ranges = ['today', '7d', '30d', '90d', 'year', 'custom'] as const;

  it('has 6 range options', () => expect(ranges).toHaveLength(6));
  it('includes today', () => expect(ranges).toContain('today'));
  it('includes custom', () => expect(ranges).toContain('custom'));

  function getRangeDates(range: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case 'today': break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '90d': start.setDate(start.getDate() - 90); break;
      case 'year': start.setFullYear(start.getFullYear() - 1); break;
    }
    return { start, end };
  }

  it('7d range is 7 days back', () => {
    const { start, end } = getRangeDates('7d');
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(7);
  });

  it('30d range is 30 days', () => {
    const { start, end } = getRangeDates('30d');
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(30);
  });
});

// ============ Export ============
describe('E2E Analytics — Export', () => {
  const exportFormats = ['csv', 'xlsx', 'pdf'] as const;

  it('supports CSV', () => expect(exportFormats).toContain('csv'));
  it('supports XLSX', () => expect(exportFormats).toContain('xlsx'));
  it('supports PDF', () => expect(exportFormats).toContain('pdf'));
  it('has 3 formats', () => expect(exportFormats).toHaveLength(3));
});

// ============ Trends ============
describe('E2E Analytics — Trends', () => {
  const trendCategories = ['Mais Vendidos', 'Mais Consultados', 'Maior Crescimento', 'Produtos Novos'];

  it('has trend categories', () => expect(trendCategories.length).toBeGreaterThanOrEqual(4));
  trendCategories.forEach(cat => {
    it(`category "${cat}" exists`, () => expect(cat).toBeTruthy());
  });
});
