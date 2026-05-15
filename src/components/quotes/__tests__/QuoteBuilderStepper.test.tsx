import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteBuilderStepper, QuoteBuilderStep } from '../QuoteBuilderStepper';
import React from 'react';

// Mocking icons to simplify snapshot/queries
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Building2: () => <div data-testid="icon-client" />,
    Package: () => <div data-testid="icon-items" />,
    CreditCard: () => <div data-testid="icon-conditions" />,
    FileCheck: () => <div data-testid="icon-review" />,
    Check: () => <div data-testid="icon-check" />,
  };
});

describe('QuoteBuilderStepper UI', () => {
  it('highlights active step with correct classes', () => {
    render(
      <QuoteBuilderStepper 
        completedSteps={[]} 
        activeStep="client" 
      />
    );
    
    const clientStep = screen.getByText('Cliente').parentElement?.querySelector('.rounded-full');
    expect(clientStep?.className).toContain('bg-primary');
    expect(clientStep?.className).toContain('text-primary-foreground');
    expect(clientStep?.className).toContain('scale-110');
  });

  it('shows check icon for completed non-active steps', () => {
    render(
      <QuoteBuilderStepper 
        completedSteps={['client']} 
        activeStep="items" 
      />
    );
    
    // Client step should have a check icon now
    expect(screen.getByTestId('icon-check')).toBeDefined();
    
    const clientText = screen.getByText('Cliente');
    const clientIconContainer = clientText.parentElement?.querySelector('.rounded-full');
    expect(clientIconContainer?.className).toContain('bg-primary/20');
  });

  it('colors connector lines correctly based on activeStep', () => {
    const { container } = render(
      <QuoteBuilderStepper 
        completedSteps={['client']} 
        activeStep="items" 
      />
    );
    
    // First connector (between 0 and 1) should be bg-primary because activeStep index (1) > current index (0)
    // We can check by selecting the inner div of the connector
    const connectors = container.querySelectorAll('.flex-1.h-0\\.5 > div');
    expect(connectors[0].className).toContain('bg-primary');
    
    // Second connector (between 1 and 2) should be bg-border because activeStep index (1) is NOT > current index (1)
    expect(connectors[1].className).toContain('bg-border');
  });

  it('marks all as muted/border when nothing is active or completed', () => {
    render(
      <QuoteBuilderStepper 
        completedSteps={[]} 
      />
    );
    
    const mutedSteps = document.querySelectorAll('.bg-muted\\/50');
    expect(mutedSteps.length).toBe(4);
  });

  it('correctly updates visual state when progressing and regressing', () => {
    const { rerender, container } = render(
      <QuoteBuilderStepper 
        completedSteps={['client']} 
        activeStep="items" 
      />
    );

    // Forward state
    let connectors = container.querySelectorAll('.flex-1.h-0\\.5 > div');
    expect(connectors[0].className).toContain('bg-primary');
    expect(screen.getByTestId('icon-check')).toBeDefined();

    // Regression state
    rerender(
      <QuoteBuilderStepper 
        completedSteps={['client']} 
        activeStep="client" 
      />
    );
    
    connectors = container.querySelectorAll('.flex-1.h-0\\.5 > div');
    expect(connectors[0].className).toContain('bg-border');
    // Active step "client" should NOT have check icon even if completed
    expect(screen.queryByTestId('icon-check')).toBeNull();
    expect(screen.getByTestId('icon-client')).toBeDefined();
  });
});
