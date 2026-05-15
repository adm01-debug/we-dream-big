/**
 * Circuit Breaker — In-memory, per Deno isolate.
 *
 * Threshold: 5 falhas em 30s → OPEN
 * OPEN: rejeita por 60s
 * HALF_OPEN: 1 request de teste; sucesso → CLOSED, falha → OPEN
 *
 * Uso:
 *   const breaker = getBreaker("crm-db");
 *   if (!breaker.canRequest()) throw new Error("circuit_open");
 *   try { ...; breaker.recordSuccess(); } catch (e) { breaker.recordFailure(); throw e; }
 */

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerConfig {
  failureThreshold: number;
  windowMs: number;
  openDurationMs: number;
}

const DEFAULT_CONFIG: BreakerConfig = {
  failureThreshold: 5,
  windowMs: 30_000,
  openDurationMs: 60_000,
};

class CircuitBreaker {
  private state: State = "CLOSED";
  private failures: number[] = [];
  private openedAt = 0;

  constructor(private name: string, private cfg: BreakerConfig = DEFAULT_CONFIG) {}

  canRequest(): boolean {
    const now = Date.now();
    if (this.state === "OPEN") {
      if (now - this.openedAt >= this.cfg.openDurationMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = [];
    this.state = "CLOSED";
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures = this.failures.filter((t) => now - t < this.cfg.windowMs);
    this.failures.push(now);

    if (this.state === "HALF_OPEN" || this.failures.length >= this.cfg.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
      console.warn(`[circuit-breaker:${this.name}] OPEN — ${this.failures.length} failures`);
    }
  }

  getState(): State {
    return this.state;
  }

  /**
   * Snapshot serializável do estado do breaker para endpoints de diagnóstico.
   *  - state        : CLOSED | OPEN | HALF_OPEN
   *  - failures     : nº de falhas dentro da janela móvel atual (windowMs)
   *  - failureThreshold / windowMs / openDurationMs : config aplicada
   *  - openedAt     : epoch ms em que abriu (0 se nunca abriu nesta vida)
   *  - willResetAt  : epoch ms em que sairá de OPEN (null se não está aberto)
   */
  getStatus(): {
    name: string;
    state: State;
    failures: number;
    failureThreshold: number;
    windowMs: number;
    openDurationMs: number;
    openedAt: number;
    willResetAt: number | null;
  } {
    const now = Date.now();
    // Recalcula janela móvel: descarta falhas antigas (mesma lógica do recordFailure).
    const liveFailures = this.failures.filter((t) => now - t < this.cfg.windowMs).length;
    return {
      name: this.name,
      state: this.state,
      failures: liveFailures,
      failureThreshold: this.cfg.failureThreshold,
      windowMs: this.cfg.windowMs,
      openDurationMs: this.cfg.openDurationMs,
      openedAt: this.openedAt,
      willResetAt: this.state === "OPEN" ? this.openedAt + this.cfg.openDurationMs : null,
    };
  }
}

/**
 * Snapshot de TODOS os breakers registrados no isolate atual.
 * Útil para endpoints de diagnóstico expor um único payload.
 */
export function getAllBreakerStatuses(): ReturnType<CircuitBreaker["getStatus"]>[] {
  return Array.from(registry.values()).map((b) => b.getStatus());
}

const registry = new Map<string, CircuitBreaker>();

export function getBreaker(name: string, cfg?: Partial<BreakerConfig>): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(name, { ...DEFAULT_CONFIG, ...cfg }));
  }
  return registry.get(name)!;
}

export function circuitOpenResponse(name: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "service_unavailable",
      reason: "circuit_open",
      service: name,
      retry_after_seconds: 60,
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
  );
}
