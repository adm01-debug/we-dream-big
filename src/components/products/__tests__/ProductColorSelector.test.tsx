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
    render(
      <TooltipProvider>
        <ProductColorSelector colors={mockColors} />
      </TooltipProvider>
    );

    const firstSwatch = screen.getAllByRole('button')[0];
    
    // Initial state: tooltip should not be in the document (or be hidden)
    expect(screen.queryByText('Vermelho')).not.toBeInTheDocument();

    // Hover
    fireEvent.mouseEnter(firstSwatch);

    // Radix Tooltip might have a delay, or it might be instant in tests if mocked/configured.
    // In our case, we set delayDuration={700} in the component, but vitest-jsdom usually handles this.
    // However, for the sake of the test being reliable, we might need to wait or adjust.
    // Actually, Radix Tooltip in tests often needs some time or a trigger.
    
    // Let's check for the text "Vermelho" which is inside the TooltipContent
    await waitFor(() => {
      expect(screen.getByText('Vermelho')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Check if it has the swatch inside the tooltip (the circle)
    const tooltipSwatch = screen.getByText('Vermelho').previousSibling;
    expect(tooltipSwatch).toHaveStyle('background-color: rgb(255, 0, 0)');

    // Leave
    fireEvent.mouseLeave(firstSwatch);
    
    await waitFor(() => {
      expect(screen.queryByText('Vermelho')).not.toBeInTheDocument();
    });
  });
});
