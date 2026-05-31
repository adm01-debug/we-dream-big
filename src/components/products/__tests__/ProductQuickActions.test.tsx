import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductQuickActions } from '../ProductQuickActions';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock Lucide icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    TableProperties: () => <div data-testid="icon-table" />,
    Palette: () => <div data-testid="icon-palette" />,
    Target: () => <div data-testid="icon-target" />,
    Layers: () => <div data-testid="icon-layers" />,
    Share2: () => <div data-testid="icon-share" />,
    X: () => <div data-testid="icon-x" />,
  };
});

describe('ProductQuickActions Tooltips', () => {
  const defaultProps = {
    productId: '123',
    productName: 'Test Product',
    basePrice: 100,
    minQuantity: 10,
    tags: { 'Público-Alvo': ['Empresas'] },
    niches: ['Tecnologia'],
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <TooltipProvider>
        <ProductQuickActions {...props} />
      </TooltipProvider>
    );
  };

  it('should not have native title attributes on action buttons', () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button.getAttribute('title')).toBeNull();
    });
  });

  it('should show the correct tooltip description on hover for enabled actions', async () => {
    renderComponent();
    
    const actions = [
      { label: 'Preços', description: 'Veja a tabela completa de preços por quantidade e variações' },
      { label: 'Gravação', description: 'Confira técnicas de gravação, áreas e cores disponíveis' },
      { label: 'Indicação', description: 'Veja para qual público, datas e ocasiões este produto é indicado' },
      { label: 'Nicho', description: 'Descubra os nichos e segmentos onde este produto se encaixa' },
    ];

    for (const action of actions) {
      const button = screen.getByRole('button', { name: new RegExp(action.label, 'i') });
      
      fireEvent.mouseOver(button);
      
      const tooltip = await screen.findByText(action.description);
      expect(tooltip).toBeInTheDocument();
      
      // Verify visual classes (translucent, blur, etc.)
      expect(tooltip.parentElement).toHaveClass('bg-popover/95');
      expect(tooltip.parentElement).toHaveClass('backdrop-blur-sm');
      
      fireEvent.mouseOut(button);
      await waitFor(() => {
        expect(screen.queryByText(action.description)).not.toBeInTheDocument();
      });
    }
  });

  it('should show "Sem dados" tooltip when action is disabled', async () => {
    renderComponent({
      ...defaultProps,
      tags: {},
      niches: [],
    });

    const disabledActions = [
      { label: 'Indicação', expected: 'Sem dados de indicação para este produto' },
      { label: 'Nicho', expected: 'Sem dados de nicho para este produto' },
    ];

    for (const action of disabledActions) {
      const button = screen.getByRole('button', { name: new RegExp(action.label, 'i') });
      expect(button).toBeDisabled();

      fireEvent.mouseOver(button);
      const tooltip = await screen.findByText(action.expected);
      expect(tooltip).toBeInTheDocument();
    }
  });
});
