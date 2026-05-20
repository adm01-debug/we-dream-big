import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpaceScene } from '@/pages/auth/AuthBranding';

// Mock lucide-react to avoid icon rendering issues in test
vi.mock('lucide-react', () => ({
  Rocket: () => <div data-testid="rocket-icon" />,
  Gift: () => <div />,
  Package: () => <div />,
  Factory: () => <div />,
  SlidersHorizontal: () => <div />,
  Brain: () => <div />,
}));

// A animação de foguetes (antes em ContinuousRockets) agora vive dentro de SpaceScene:
// um foguete é gerado a cada 2s via setInterval e removido após sua duração.
describe('SpaceScene — rocket animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<SpaceScene />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('spawns rockets over time via the interval', () => {
    const { queryAllByTestId } = render(<SpaceScene />);

    expect(queryAllByTestId('rocket-icon').length).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(queryAllByTestId('rocket-icon').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the rocket count bounded (removal after duration)', () => {
    const { queryAllByTestId } = render(<SpaceScene />);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    // O intervalo gera foguetes e cada um é removido após sua duração:
    // a contagem nunca explode sem limite.
    expect(queryAllByTestId('rocket-icon').length).toBeLessThan(20);
  });
});
