import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';
import { useDevGate } from '@/hooks/admin/useDevGate';

// Mock do hook useDevGate
vi.mock('@/hooks/admin/useDevGate', () => ({
  useDevGate: vi.fn(),
}));

// Mock do overlay real
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => <div data-testid="bridge-metrics-overlay-real">Overlay Visible</div>,
}));

describe('DevInfraGate Matrix — Parameterized Permission Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // DevOnlyBridgeOverlay usa <DevOnly strict> → visibilidade segue isDev (role
  // dev REAL), ignorando isAllowed (override/admin). Ver DevOnlyBridgeOverlay.tsx.
  const testCases = [
    { isAllowed: true,  isDev: true,  expectedVisible: true,  desc: 'Usuário Dev real (strict) — visível' },
    { isAllowed: true,  isDev: false, expectedVisible: false, desc: 'Não-Dev com permissão aprovada — strict bloqueia' },
    { isAllowed: false, isDev: true,  expectedVisible: true,  desc: 'Dev real mesmo com isAllowed=false — strict usa isDev' },
    { isAllowed: false, isDev: false, expectedVisible: false, desc: 'Usuário comum — bloqueado' },
  ];

  it.each(testCases)('$desc -> visível: $expectedVisible', async ({ isAllowed, isDev, expectedVisible }) => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed, isDev });
    
    const { container } = render(<DevOnlyBridgeOverlay />);
    
    if (expectedVisible) {
      expect(await screen.findByTestId('bridge-metrics-overlay-real')).toBeInTheDocument();
    } else {
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('bridge-metrics-overlay-real')).not.toBeInTheDocument();
    }
  });
});
