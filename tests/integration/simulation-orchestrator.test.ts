import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Integration test for the Simulation Orchestrator.
 * This ensures the bridge between frontend and simulation logic is intact.
 *
 * Note: `supabase.functions` is a getter that returns a NEW FunctionsClient instance
 * on every access. To spy reliably, we capture one reference in beforeEach and use
 * it for both the spy installation and the actual invoke call.
 */
describe('Simulation Orchestrator Integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fns: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let invokeSpy: any;

  beforeEach(() => {
    // Capture a single reference so spy and call target the same object.
    fns = supabase.functions;
    invokeSpy = vi.spyOn(fns, 'invoke');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger a resilience simulation successfully', async () => {
    await fns.invoke('simulation-orchestrator', {
      body: { count: 10, mode: 'resilience' }
    });

    expect(invokeSpy).toHaveBeenCalledWith('simulation-orchestrator', expect.objectContaining({
      body: expect.objectContaining({ mode: 'resilience' })
    }));
  });

  it('should trigger a load test with high count', async () => {
    await fns.invoke('simulation-orchestrator', {
      body: { count: 500, mode: 'load' }
    });

    expect(invokeSpy).toHaveBeenCalledWith('simulation-orchestrator', expect.objectContaining({
      body: expect.objectContaining({ count: 500, mode: 'load' })
    }));
  });

  it('should trigger a fuzzing test', async () => {
    await fns.invoke('simulation-orchestrator', {
      body: { count: 50, mode: 'fuzzing' }
    });

    expect(invokeSpy).toHaveBeenCalledWith('simulation-orchestrator', expect.objectContaining({
      body: expect.objectContaining({ mode: 'fuzzing' })
    }));
  });
});
