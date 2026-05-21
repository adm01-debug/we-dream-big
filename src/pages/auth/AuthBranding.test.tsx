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

// Tests for the rocket animation in the branding panel.

describe('SpaceScene Component', () => {
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

  it('spawns a rocket on each 2s interval tick', () => {
    const { getAllByTestId, queryAllByTestId } = render(<SpaceScene />);

    // Sem ticks ainda → nenhum foguete (setInterval dispara só após o intervalo).
    expect(queryAllByTestId('rocket-icon').length).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(getAllByTestId('rocket-icon').length).toBe(1);

    // Mais dois ticks (4s, 6s); cada foguete vive 5-8s, nenhum removido ainda.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(getAllByTestId('rocket-icon').length).toBe(3);
  });

  it('removes rockets after their duration (steady state stays bounded)', () => {
    const { queryAllByTestId } = render(<SpaceScene />);

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(queryAllByTestId('rocket-icon').length).toBe(3);

    // Spawn a cada 2s, vida 5-8s → estado estável tem no máximo ~4-5 foguetes vivos.
    // Sem remoção, seriam ~18; o limite prova que a remoção ocorre.
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    const currentCount = queryAllByTestId('rocket-icon').length;
    expect(currentCount).toBeGreaterThan(0);
    expect(currentCount).toBeLessThanOrEqual(5);
  });
});
