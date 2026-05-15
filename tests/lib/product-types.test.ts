import { describe, it, expect } from 'vitest';
import { getProductImageUrl, getProductPrice, getProductStock, shouldFallbackSelect } from '@/lib/external-db/product-types';
import type { PromobrindProduct } from '@/lib/external-db/product-types';

const baseProduct: PromobrindProduct = {
  id: '1', name: 'Test', sku: 'TST-001',
  image_url: null, images: null, primary_image_url: null,
  category_id: null, main_category_id: null,
  supplier_id: null, supplier_reference: null,
  description: null, short_description: null, brand: null,
  is_active: true, active: true,
};

describe('getProductImageUrl', () => {
  it('should prefer primary_image_url', () => {
    const p = { ...baseProduct, primary_image_url: 'primary.jpg', image_url: 'fallback.jpg' };
    expect(getProductImageUrl(p)).toBe('primary.jpg');
  });

  it('should fallback to image_url', () => {
    const p = { ...baseProduct, image_url: 'img.jpg' };
    expect(getProductImageUrl(p)).toBe('img.jpg');
  });

  it('should fallback to first image in images array', () => {
    const p = { ...baseProduct, images: ['arr.jpg'] } as any;
    expect(getProductImageUrl(p)).toBe('arr.jpg');
  });

  it('should return null when no images', () => {
    expect(getProductImageUrl(baseProduct)).toBeNull();
  });
});

describe('getProductPrice', () => {
  it('should prefer sale_price', () => {
    expect(getProductPrice({ ...baseProduct, sale_price: 99.99, base_price: 50 })).toBe(99.99);
  });

  it('should fallback to base_price', () => {
    expect(getProductPrice({ ...baseProduct, base_price: 50 })).toBe(50);
  });

  it('should return 0 when no price', () => {
    expect(getProductPrice(baseProduct)).toBe(0);
  });

  it('should handle null sale_price gracefully', () => {
    expect(getProductPrice({ ...baseProduct, sale_price: null, base_price: 30 })).toBe(30);
  });
});

describe('getProductStock', () => {
  it('should return stock_quantity', () => {
    expect(getProductStock({ ...baseProduct, stock_quantity: 100 })).toBe(100);
  });

  it('should return 0 when null/undefined', () => {
    expect(getProductStock(baseProduct)).toBe(0);
    expect(getProductStock({ ...baseProduct, stock_quantity: null })).toBe(0);
  });
});

describe('shouldFallbackSelect', () => {
  it('should return true for sale_price errors', () => {
    expect(shouldFallbackSelect(new Error('column sale_price does not exist'))).toBe(true);
  });

  it('should return true for base_price errors', () => {
    expect(shouldFallbackSelect(new Error('base_price undefined column'))).toBe(true);
  });

  it('should return false for unrelated errors', () => {
    expect(shouldFallbackSelect(new Error('network timeout'))).toBe(false);
  });

  it('should handle string errors', () => {
    expect(shouldFallbackSelect('sale_price does not exist')).toBe(true);
  });
});
