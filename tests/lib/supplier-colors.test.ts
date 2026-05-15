import { describe, it, expect } from 'vitest';
import { getSupplierColors, getSupplierBadgeClasses } from '@/lib/supplier-colors';

describe('getSupplierColors', () => {
  it('returns XBZ colors for xbz supplier', () => {
    const colors = getSupplierColors('XBZ Brindes');
    expect(colors.hex).toBe('#1E40AF');
    expect(colors.bg).toContain('1E40AF');
  });

  it('returns Spot colors for SPOT supplier', () => {
    const colors = getSupplierColors('SPOT Import');
    expect(colors.hex).toBe('#065F46');
  });

  it('returns Spot colors for Stricker supplier', () => {
    const colors = getSupplierColors('Stricker');
    expect(colors.hex).toBe('#065F46');
  });

  it('returns Asia colors for Asia Import', () => {
    const colors = getSupplierColors('Asia Import');
    expect(colors.hex).toBe('#991B1B');
  });

  it('returns default colors for unknown supplier', () => {
    const colors = getSupplierColors('Unknown Supplier');
    expect(colors.hex).toBe('#9A3412');
  });

  it('is case insensitive', () => {
    expect(getSupplierColors('XBZ').hex).toBe(getSupplierColors('xbz').hex);
  });
});

describe('getSupplierBadgeClasses', () => {
  it('returns combined CSS classes', () => {
    const classes = getSupplierBadgeClasses('XBZ');
    expect(classes).toContain('bg-');
    expect(classes).toContain('text-');
    expect(classes).toContain('border');
  });

  it('includes border class for known suppliers', () => {
    const classes = getSupplierBadgeClasses('SPOT');
    expect(classes).toContain('border-');
  });
});
