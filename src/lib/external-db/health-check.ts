/**
 * Health-check leve para o `external-db-bridge`.
 *
 * Antes de disparar fan-outs paralelos (ex.: 6+ chamadas simultâneas no admin),
 * a UI pode aguardar `waitForBridgeReady()` para garantir que o isolate está
 * quente. Isso evita cascatas de 503 `SUPABASE_EDGE_RUNTIME_ERROR` em cold
 * starts.
 *
 * Estratégia:
 *  - `pingHealth()`: 1 chamada com timeout curto (default 2.5s). Sem retry —
 *    apenas reporta o estado atual.
 *  - `waitForBridgeReady()`: poll com backoff exponencial até 200 ou timeout
 *    global. Cacheia "ready" por READY_CACHE_MS para chamadas próximas.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type BridgeHealth = {
  ok: boolean;
  ms: number;
  status?: number;
  error?: string;
};

const READY_CACHE_MS = 30_000; // 30s — janela em que consideramos o bridge quente
let lastReadyAt = 0;
let inFlightWait: Promise<BridgeHealth> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Faz UMA chamada de ping ao bridge. Não tenta de novo em caso de falha.
 */
export async function pingHealth(timeoutMs = 2500): Promise<BridgeHealth> {
  const t0 = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.functions.invoke('external-db-bridge', { body: { operation: 'ping' } }),
      timeoutMs,
      'health-check',
    );
    const ms = Math.round(performance.now() - t0);
    if (error) {
      const status = (error as { status?: number; context?: { status?: number } })?.status
        ?? (error as { context?: { status?: number } })?.context?.status;
      return { ok: false, ms, status, error: error.message };
    }
    lastReadyAt = Date.now();
    return { ok: true, ms };
  } catch (err) {
    return {
      ok: false,
      ms: Math.round(performance.now() - t0),
      error: (err as Error)?.message ?? 'unknown',
    };
  }
}

/**
 * Aguarda o bridge ficar pronto (200 OK), com backoff exponencial.
 * Retorna imediatamente se um ping recente confirmou prontidão (cache).
 *
 * @param totalTimeoutMs orçamento total de espera (default 8s)
 */
export async function waitForBridgeReady(totalTimeoutMs = 5000): Promise<BridgeHealth> {
  // Cache hit — bridge já confirmado quente recentemente.
  if (Date.now() - lastReadyAt < READY_CACHE_MS) {
    return { ok: true, ms: 0 };
  }
  // Coalesce: várias telas chamando em paralelo compartilham o mesmo wait.
  if (inFlightWait) return inFlightWait;

  inFlightWait = (async () => {
    const start = performance.now();
    let attempt = 0;
    let last: BridgeHealth = { ok: false, ms: 0, error: 'not-attempted' };

    while (performance.now() - start < totalTimeoutMs) {
      attempt++;
      const remaining = totalTimeoutMs - (performance.now() - start);
      // Ping curto (1.2s default) — boot warm responde em <250ms; budget restante
      // funciona como teto. Não precisamos de 2.5s por tentativa.
      const perAttempt = Math.min(1200, Math.max(600, remaining));
      last = await pingHealth(perAttempt);
      if (last.ok) {
        logger.log(`[Health] ✅ bridge ready in ${Math.round(performance.now() - start)}ms (${attempt}x)`);
        return last;
      }
      // Backoff acelerado: 80 → 160 → 320 → 500 → 500 (cap 500ms) com jitter ±20%.
      // Cap menor (era 800ms) acelera a detecção pós-warm sem aumentar carga:
      // mesmo no pior caso (5 tentativas) ainda são apenas 5 pings totais.
      const base = Math.min(500, 80 * Math.pow(2, attempt - 1));
      const jitter = base * (0.8 + Math.random() * 0.4); // 0.8x–1.2x
      const delay = Math.round(jitter);
      if (performance.now() - start + delay >= totalTimeoutMs) break;
      await new Promise((r) => setTimeout(r, delay));
    }
    logger.warn(`[Health] ⛔ bridge not ready after ${attempt} attempts (${last.error ?? 'unknown'})`);
    return last;
  })();

  try {
    return await inFlightWait;
  } finally {
    inFlightWait = null;
  }
}

/** Limpa o cache — útil em testes ou após erro confirmado. */
export function invalidateBridgeReadyCache(): void {
  lastReadyAt = 0;
}
