import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, formatUnitPrice } from '@/lib/format';

describe('formatCurrency', () => {
  it('should format positive values in BRL', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
  });

  it('should format negative values', () => {
    const result = formatCurrency(-99.99);
    expect(result).toContain('99,99');
  });

  it('should always show 2 decimal places', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100,00');
  });
});

describe('formatCurrencyCompact', () => {
  it('should format without decimals', () => {
    const result = formatCurrencyCompact(1234);
    expect(result).toContain('1.234');
    expect(result).not.toContain(',00');
  });
});

describe('formatUnitPrice', () => {
  it('should append /un suffix', () => {
    const result = formatUnitPrice(25.50);
    expect(result).toContain('/un');
    expect(result).toContain('25,50');
  });
});
