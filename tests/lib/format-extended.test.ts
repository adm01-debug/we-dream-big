/**
 * Extended format tests — covers formatCurrency, formatCurrencyCompact, formatUnitPrice
 */
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, formatUnitPrice } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it('formats integer', () => {
    expect(formatCurrency(100)).toMatch(/R\$\s*100,00/);
  });

  it('formats cents', () => {
    expect(formatCurrency(5.99)).toMatch(/R\$\s*5,99/);
  });

  it('formats large number with thousands separator', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toMatch(/1.*234.*567/);
  });

  it('formats negative values', () => {
    const result = formatCurrency(-42.5);
    expect(result).toContain('42,50');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(1.999);
    expect(result).toMatch(/2,00/);
  });
});

describe('formatCurrencyCompact', () => {
  it('formats without decimals', () => {
    const result = formatCurrencyCompact(100);
    expect(result).toMatch(/R\$\s*100/);
    expect(result).not.toContain(',00');
  });

  it('formats zero', () => {
    expect(formatCurrencyCompact(0)).toMatch(/R\$\s*0/);
  });

  it('formats large number', () => {
    const result = formatCurrencyCompact(15000);
    expect(result).toMatch(/15.*000/);
  });
});

describe('formatUnitPrice', () => {
  it('appends /un suffix', () => {
    const result = formatUnitPrice(5.99);
    expect(result).toContain('/un');
  });

  it('uses BRL format', () => {
    const result = formatUnitPrice(10);
    expect(result).toMatch(/R\$/);
    expect(result).toContain('/un');
  });

  it('formats zero', () => {
    const result = formatUnitPrice(0);
    expect(result).toMatch(/R\$\s*0,00\/un/);
  });
});
