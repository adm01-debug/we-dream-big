import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber } from '@/components/pricing/simulator/utils';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0,00');
  });

  it('formats positive values', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('R$');
  });

  it('formats negative values', () => {
    const result = formatCurrency(-50);
    expect(result).toContain('50,00');
  });

  it('formats large values with thousand separators', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
  });
});

describe('formatNumber', () => {
  it('formats integers with thousand separators', () => {
    expect(formatNumber(5000)).toBe('5.000');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
