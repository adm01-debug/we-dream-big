import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductGrid } from './ProductGrid';

describe('ProductGrid Skeleton', () => {
  it('renders skeletons when isLoading is true and products are empty', () => {
    render(
      <ProductGrid 
        products={[]} 
        isLoading={true} 
      />
    );
    
    // Check if at least some skeleton elements are present
    // The ProductCardSkeleton has animate-shimmer or similar classes
    const skeletons = document.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders actual products when not loading', () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', slug: 'p1', supplier_id: 's1', category_id: 'c1' } as any
    ];
    
    render(
      <ProductGrid 
        products={mockProducts} 
        isLoading={false} 
      />
    );
    
    expect(screen.getByText('Product 1')).toBeDefined();
    const skeletons = document.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBe(0);
  });
});
