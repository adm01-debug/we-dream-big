/**
 * DevOnlyBridgeOverlay — wrapper que gateia o BridgeMetricsOverlay por papel `dev`.
 *
 * O componente usa <DevOnly strict>, ou seja, apenas `isDev` controla a visibilidade.
 * Overrides via env/localStorage (isAllowed) são ignorados no modo strict.
 *
 * Valida:
 *  - Não-dev (isDev=false): retorna null independente de isAllowed.
 *  - Dev (isDev=true): monta o overlay independente de isAllowed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';

import { useDevGate } from '@/hooks/admin/useDevGate';

vi.mock('@/hooks/admin/useDevGate', () => ({
  useDevGate: vi.fn(),
}));

// O overlay real importa telemetria + faz checks de import.meta.env.PROD.
// Mockamos como um marker simples para validar SOMENTE o gate.
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => <div data-testid="bridge-metrics-overlay-mock">overlay</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DevOnlyBridgeOverlay — gate por papel + SSOT', () => {
  it('NÃO renderiza overlay para usuário não-dev (default do gate)', () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: false, isDev: false });
    const { container } = render(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('bridge-metrics-overlay-mock')).not.toBeInTheDocument();
  });

  it('renderiza overlay para usuário dev (gate aprovado por role)', async () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: true, isDev: true });
    render(<DevOnlyBridgeOverlay />);
    expect(await screen.findByTestId('bridge-metrics-overlay-mock')).toBeInTheDocument();
  });

  it('modo strict: dev com isAllowed=false ainda renderiza (isDev prevalece)', async () => {
    // strict=true → allowed = isDev = true → deve renderizar
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: false, isDev: true });
    render(<DevOnlyBridgeOverlay />);
    expect(await screen.findByTestId('bridge-metrics-overlay-mock')).toBeInTheDocument();
  });

  it('modo strict: não-dev com isAllowed=true é bloqueado (isDev prevalece)', () => {
    // strict=true → allowed = isDev = false → deve bloquear
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: true, isDev: false });
    const { container } = render(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
  });
});
