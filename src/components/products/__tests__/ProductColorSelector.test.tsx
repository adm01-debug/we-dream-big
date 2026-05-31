import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductColorSelector } from '../ProductColorSelector';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock color data
const mockColors = [
  { id: '1', name: 'Vermelho', hex: '#FF0000', variationName: 'Vermelho', groupName: 'Cores Quentes' },
  { id: '2', name: 'Azul', hex: '#0000FF', variationName: 'Azul', groupName: 'Cores Frias' },
];

describe('ProductColorSelector Tooltip', () => {
  it('does not have a native title attribute on swatches', () => {
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

  it('shows the custom tooltip on hover and hides it on leave', async () => {
    vi.useFakeTimers();
    render(
      <TooltipProvider>
        <ProductColorSelector colors={mockColors} />
      </TooltipProvider>
    );

    const swatches = screen.getAllByRole('button');
    const firstSwatch = swatches[0];
    
    // Initial state: tooltip should not be in the document
    expect(screen.queryByTestId('color-tooltip-swatch')).not.toBeInTheDocument();

    // Hover
    fireEvent.mouseEnter(firstSwatch);
    
    // Fast-forward for Radix delay (700ms in component)
    vi.advanceTimersByTime(800);
    
    // Now it should be there
    await waitFor(() => {
      expect(screen.getByTestId('color-tooltip-swatch')).toBeInTheDocument();
    });

    const swatch = screen.getByTestId('color-tooltip-swatch');
    expect(swatch.style.backgroundColor).toMatch(/rgb\(255, 0, 0\)|#ff0000/i);
    expect(screen.getByText('Vermelho')).toBeInTheDocument();

    // Leave
    fireEvent.mouseLeave(firstSwatch);
    vi.advanceTimersByTime(800);
    
    await waitFor(() => {
      expect(screen.queryByTestId('color-tooltip-swatch')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});
