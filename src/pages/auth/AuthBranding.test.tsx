import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpaceScene } from '@/pages/auth/AuthBranding';

// Mock lucide-react to make icon rendering deterministic in tests
vi.mock('lucide-react', () => ({
  Rocket: () => <div data-testid="rocket-icon" />,
  Gift: () => <div />,
  Package: () => <div />,
  Factory: () => <div />,
  SlidersHorizontal: () => <div />,
  Brain: () => <div />,
  CheckCircle2: () => <div />,
  RotateCw: () => <div />,
}));

// The legacy `ContinuousRockets` component was unified into `SpaceScene`
// (commit refactor: AuthBranding.tsx). SpaceScene is a richer scene that
// continuously spawns rockets at intervals via setInterval(2000ms) +
// manages stars and astronauts. The smoke tests below just validate that
// the scene mounts, exposes its anchor testid and starts producing rockets
// after the first interval tick.
describe('SpaceScene Component (renamed from ContinuousRockets)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<SpaceScene />);
    expect(getByTestId('space-scene')).toBeInTheDocument();
  });

  it('spawns rockets after the first interval tick (~2s)', () => {
    const { queryAllByTestId } = render(<SpaceScene />);

    // No rockets at mount
    expect(queryAllByTestId('rocket-icon').length).toBe(0);

    // After one full interval cycle, at least one rocket should exist
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(queryAllByTestId('rocket-icon').length).toBeGreaterThanOrEqual(1);
  });

  it('accepts isFull prop without throwing', () => {
    const { getByTestId } = render(<SpaceScene isFull={false} />);
    expect(getByTestId('space-scene')).toBeInTheDocument();
  });
});
