/**
 * recordDevRouteTelemetry — telemetria de UX da tela DevRoute (403)
 *
 * Garante que:
 *  - Chama a RPC `record_dev_route_telemetry` com o payload mínimo (sem PII).
 *  - Coalescing local: dispara o mesmo (event, path) só uma vez na janela.
 *  - Eventos diferentes para o mesmo path não são coalescidos.
 *  - Erros da RPC são engolidos (telemetria nunca quebra UX).
 *  - userRole e durationMs ausentes viram `undefined` (não `null`) — o
 *    types.ts gerado pelo Supabase exige `string | undefined` para args.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import {
  recordDevRouteTelemetry,
  type DevRouteUxEvent,
} from '@/lib/access/dev-route-telemetry';

beforeEach(() => {
  rpcMock.mockClear();
  rpcMock.mockResolvedValue({ data: null, error: null });
  // Cada teste usa um path único para isolar o cache de coalescing
  // (que é módulo-singleton) — usamos performance.now() no path.
});

function uniquePath(suffix = '') {
  return `/admin/telemetria-${performance.now()}${suffix}`;
}

describe('recordDevRouteTelemetry — payload e RPC', () => {
  it('chama record_dev_route_telemetry com event_type, path, role e duration arredondado', async () => {
    const path = uniquePath();
    await recordDevRouteTelemetry({
      event: 'view',
      blockedPath: path,
      userRole: 'supervisor',
      durationMs: 1234.7,
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('record_dev_route_telemetry', {
      _event_type: 'view',
      _blocked_path: path,
      _user_role: 'supervisor',
      _duration_ms: 1235,
    });
  });

  it('passa undefined (não null) quando userRole/durationMs estão ausentes', async () => {
    const path = uniquePath('-no-role');
    await recordDevRouteTelemetry({
      event: 'view',
      blockedPath: path,
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const args = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(args._user_role).toBeUndefined();
    expect(args._duration_ms).toBeUndefined();
  });

  it('não envia PII: payload contém apenas event_type, path, role e duration', async () => {
    const path = uniquePath('-pii');
    await recordDevRouteTelemetry({
      event: 'request_access',
      blockedPath: path,
      userRole: 'agente',
      durationMs: 500,
    });
    const args = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(args).sort()).toEqual([
      '_blocked_path',
      '_duration_ms',
      '_event_type',
      '_user_role',
    ]);
  });
});

describe('recordDevRouteTelemetry — coalescing', () => {
  it('coalesca duplicatas do mesmo (event, path) na janela de 2s', async () => {
    const path = uniquePath('-dup');
    await recordDevRouteTelemetry({ event: 'view', blockedPath: path });
    await recordDevRouteTelemetry({ event: 'view', blockedPath: path });
    await recordDevRouteTelemetry({ event: 'view', blockedPath: path });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('não coalesca eventos diferentes para o mesmo path', async () => {
    const path = uniquePath('-multi-event');
    const events: DevRouteUxEvent[] = ['view', 'copy_link', 'retry', 'request_access'];
    for (const event of events) {
      await recordDevRouteTelemetry({ event, blockedPath: path });
    }
    expect(rpcMock).toHaveBeenCalledTimes(events.length);
  });

  it('não coalesca o mesmo evento para paths diferentes', async () => {
    await recordDevRouteTelemetry({ event: 'view', blockedPath: uniquePath('-a') });
    await recordDevRouteTelemetry({ event: 'view', blockedPath: uniquePath('-b') });
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});

describe('recordDevRouteTelemetry — resiliência', () => {
  it('engole erro da RPC (não rejeita)', async () => {
    rpcMock.mockRejectedValueOnce(new Error('boom'));
    await expect(
      recordDevRouteTelemetry({
        event: 'view',
        blockedPath: uniquePath('-err'),
      }),
    ).resolves.toBeUndefined();
  });
});
