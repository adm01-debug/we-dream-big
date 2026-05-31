import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductColorSelector, CompactColorDots } from '../ProductColorSelector';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock color data
const mockColors = [
  { id: '1', name: 'Vermelho', hex: '#FF0000', variationName: 'Vermelho', groupName: 'Cores Quentes' },
  { id: '2', name: 'Azul', hex: '#0000FF', variationName: 'Azul', groupName: 'Cores Frias' },
];

describe('ProductColorSelector Tooltip Requirements', () => {
  it('does not have a native title attribute on swatches in ProductColorSelector', () => {
    render(
      <TooltipProvider>
        <ProductColorSelector colors={mockColors} />
      </TooltipProvider>
    );

    const swatches = screen.getAllByRole('button');
    swatches.forEach(swatch => {
      expect(swatch.getAttribute('title')).toBeNull();
    });
  });

  it('does not have a native title attribute on dots in CompactColorDots', () => {
    render(
      <TooltipProvider>
        <CompactColorDots colors={mockColors} />
      </TooltipProvider>
    );

    // CompactColorDots renders spans inside TooltipTrigger
    const dots = screen.getByText('Vermelho').closest('div')?.querySelectorAll('span');
    dots?.forEach(dot => {
      if (dot.style.backgroundColor) { // It's a color dot
        expect(dot.getAttribute('title')).toBeNull();
      }
    });
  });
});
