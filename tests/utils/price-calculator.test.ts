import { describe, it, expect } from 'vitest';
import {
  calculateBoxPrice,
  calculateItemsPrice,
  calculatePersonalizationPrice,
  calculateTotalKitPrice,
  calculateSavings,
  formatCurrency as kitFormatCurrency,
  formatUnitPrice as kitFormatUnitPrice,
} from '@/lib/kit-builder/price-calculator';
import type { KitItem, KitBox, KitPersonalization } from '@/lib/kit-builder/types';

const mockBox: KitBox = { id: 'box1', name: 'Caixa P', price: 10, imageUrl: '' };
const mockItems: KitItem[] = [
  { id: 'item1', name: 'Caneta', productId: 'p1', price: 5, quantity: 2, imageUrl: '' },
  { id: 'item2', name: 'Caderno', productId: 'p2', price: 20, quantity: 1, imageUrl: '' },
];

const emptyPersonalization: KitPersonalization = {
  box: { enabled: false },
  items: {},
};

describe('calculateBoxPrice', () => {
  it('returns 0 for null box', () => {
    expect(calculateBoxPrice(null)).toBe(0);
  });
  it('multiplies box price by quantity', () => {
    expect(calculateBoxPrice(mockBox, 5)).toBe(50);
  });
  it('defaults quantity to 1', () => {
    expect(calculateBoxPrice(mockBox)).toBe(10);
  });
});

describe('calculateItemsPrice', () => {
  it('sums item price * quantity', () => {
    expect(calculateItemsPrice(mockItems)).toBe(30); // 5*2 + 20*1
  });
  it('returns 0 for empty array', () => {
    expect(calculateItemsPrice([])).toBe(0);
  });
});

describe('calculatePersonalizationPrice', () => {
  it('returns 0 when disabled', () => {
    expect(calculatePersonalizationPrice(emptyPersonalization, mockItems)).toBe(0);
  });

  it('calculates box personalization', () => {
    const pers: KitPersonalization = {
      box: { enabled: true, estimatedPrice: 3 },
      items: {},
    };
    expect(calculatePersonalizationPrice(pers, mockItems, 10)).toBe(30);
  });

  it('calculates item personalization', () => {
    const pers: KitPersonalization = {
      box: { enabled: false },
      items: {
        item1: { enabled: true, estimatedPrice: 2 },
      },
    };
    // item1 qty=2, price=2 each → 4
    expect(calculatePersonalizationPrice(pers, mockItems, 1)).toBe(4);
  });
});

describe('calculateTotalKitPrice', () => {
  it('computes full breakdown', () => {
    const result = calculateTotalKitPrice(mockBox, mockItems, emptyPersonalization, 2);
    expect(result.boxPrice).toBe(20);      // 10*2
    expect(result.itemsPrice).toBe(60);    // 30*2
    expect(result.personalizationPrice).toBe(0);
    expect(result.subtotal).toBe(80);
    expect(result.total).toBe(80);
    expect(result.unitPrice).toBe(40);
  });

  it('handles zero quantity', () => {
    const result = calculateTotalKitPrice(null, [], emptyPersonalization, 0);
    expect(result.unitPrice).toBe(0);
  });
});

describe('calculateSavings', () => {
  it('computes savings amount and percentage', () => {
    const result = calculateSavings(80, 100);
    expect(result.amount).toBe(20);
    expect(result.percent).toBe(20);
  });

  it('floors at zero when kit is more expensive', () => {
    const result = calculateSavings(120, 100);
    expect(result.amount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it('handles zero individual price', () => {
    const result = calculateSavings(0, 0);
    expect(result.percent).toBe(0);
  });
});

describe('kit formatCurrency', () => {
  it('formats BRL', () => {
    expect(kitFormatCurrency(100)).toContain('R$');
    expect(kitFormatCurrency(100)).toContain('100');
  });
});

describe('kit formatUnitPrice', () => {
  it('shows /un suffix', () => {
    expect(kitFormatUnitPrice(100, 4)).toContain('/un');
    expect(kitFormatUnitPrice(100, 4)).toContain('25');
  });
  it('handles zero quantity', () => {
    expect(kitFormatUnitPrice(100, 0)).toContain('R$');
  });
});
