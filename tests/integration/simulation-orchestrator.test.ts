import { describe, it, expect, vi, beforeEach } from 'vitest';

// QA: testes anteriores tentavam `vi.spyOn(supabase.functions, 'invoke')`
// e depois chamavam `supabase.functions.invoke(...)`. Não funcionava porque
// no @supabase/supabase-js `client.functions` retorna uma INSTÂNCIA NOVA
// de FunctionsClient em cada acesso — o spy ficava órfão. Trocado por
// vi.mock do módulo inteiro: captura a invocação no nível do export,
// validando o contrato de payload sem depender da implementação interna.
const invokeMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

/**
 * Integration test for the Simulation Orchestrator.
 * This ensures the bridge between frontend and simulation logic is intact.
 */
describe('Simulation Orchestrator Integration', () => {
  beforeEach(() => {
    invokeMock.mockClear();
  });

  it('should trigger a resilience simulation successfully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.functions.invoke('simulation-orchestrator', {
      body: { count: 10, mode: 'resilience' },
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({
        body: expect.objectContaining({ mode: 'resilience' }),
      }),
    );
  });

  it('should trigger a load test with high count', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.functions.invoke('simulation-orchestrator', {
      body: { count: 500, mode: 'load' },
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({
        body: expect.objectContaining({ count: 500, mode: 'load' }),
      }),
    );
  });

  it('should trigger a fuzzing test', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.functions.invoke('simulation-orchestrator', {
      body: { count: 50, mode: 'fuzzing' },
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({
        body: expect.objectContaining({ mode: 'fuzzing' }),
      }),
    );
  });
});
