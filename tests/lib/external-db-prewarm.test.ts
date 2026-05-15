import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/external-db/health-check', () => ({
  waitForBridgeReady: vi.fn().mockResolvedValue({ ok: true, ms: 50 }),
}));

describe('prewarmExternalDb — idempotência por sessão', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: null, error: null });
  });

  it('não dispara invocações na 2ª chamada com oncePerSession=true', async () => {
    const mod = await import('@/lib/external-db-prewarm');

    await mod.prewarmExternalDb({ oncePerSession: true });
    const callsAfterFirst = invokeMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    await mod.prewarmExternalDb({ oncePerSession: true });
    expect(invokeMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it('resetPrewarmSession permite re-prewarm', async () => {
    const mod = await import('@/lib/external-db-prewarm');

    await mod.prewarmExternalDb({ oncePerSession: true });
    const first = invokeMock.mock.calls.length;

    mod.resetPrewarmSession();
    await mod.prewarmExternalDb({ oncePerSession: true, force: true });
    expect(invokeMock.mock.calls.length).toBeGreaterThan(first);
  });

  it('marca sessionStorage após sucesso', async () => {
    const mod = await import('@/lib/external-db-prewarm');
    await mod.prewarmExternalDb({ oncePerSession: true });
    expect(sessionStorage.getItem('__pg_prewarm_done__')).toBe('1');
  });
});
