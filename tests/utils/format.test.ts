import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, formatUnitPrice } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0,00');
  });

  it('formats a positive value', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('R$');
  });

  it('formats a negative value', () => {
    const result = formatCurrency(-50);
    expect(result).toContain('50,00');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(9.999);
    expect(result).toContain('10,00');
  });
});

describe('formatCurrencyCompact', () => {
  it('formats without decimals', () => {
    const result = formatCurrencyCompact(1500);
    expect(result).toContain('R$');
    expect(result).toContain('1.500');
    expect(result).not.toContain(',00');
  });
});

describe('formatUnitPrice', () => {
  it('appends /un suffix', () => {
    const result = formatUnitPrice(25);
    expect(result).toContain('/un');
    expect(result).toContain('R$');
  });
});
