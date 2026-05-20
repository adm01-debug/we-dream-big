import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Integration test for the Simulation Orchestrator.
 * Valida que o bridge frontend → edge function 'simulation-orchestrator' é
 * acionado com o payload correto.
 *
 * NOTA: `supabase.functions` é um getter que pode recriar o FunctionsClient a
 * cada acesso, então capturamos a referência UMA vez e espionamos/chamamos
 * sempre a mesma instância (do contrário o spy registra 0 chamadas).
 */
const functions = supabase.functions;

describe('Simulation Orchestrator Integration', () => {
  let invokeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    invokeSpy = vi
      .spyOn(functions, 'invoke')
      .mockResolvedValue({ data: { ok: true }, error: null } as never);
  });

  it('should trigger a resilience simulation successfully', async () => {
    await functions.invoke('simulation-orchestrator', { body: { count: 10, mode: 'resilience' } });

    expect(invokeSpy).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({ body: expect.objectContaining({ mode: 'resilience' }) }),
    );
  });

  it('should trigger a load test with high count', async () => {
    await functions.invoke('simulation-orchestrator', { body: { count: 500, mode: 'load' } });

    expect(invokeSpy).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({ body: expect.objectContaining({ count: 500, mode: 'load' }) }),
    );
  });

  it('should trigger a fuzzing test', async () => {
    await functions.invoke('simulation-orchestrator', { body: { count: 50, mode: 'fuzzing' } });

    expect(invokeSpy).toHaveBeenCalledWith(
      'simulation-orchestrator',
      expect.objectContaining({ body: expect.objectContaining({ mode: 'fuzzing' }) }),
    );
  });
});
