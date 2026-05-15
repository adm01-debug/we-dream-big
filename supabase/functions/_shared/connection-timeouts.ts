// SSOT for per-connection-type timeouts. Shared between `connection-tester`
// (manual) and `connections-auto-test` (cron). Keeps defaults realistic per
// destination latency profile and clamps user-provided overrides.
export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";

/** Per-type defaults (ms). Tuned to real-world latency expectations. */
export const DEFAULT_TIMEOUTS_MS: Record<ConnectionType, number> = {
  supabase: 6000,           // PostgREST direto, deve responder rápido
  bitrix24: 12000,          // CRM externo, pode ter lag de WAN
  n8n: 10000,               // automação self-hosted, médio
  mcp: 8000,                // chamada interna ao próprio backend
  webhook_outbound: 15000,  // webhooks arbitrários de terceiros
};

export const MIN_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 30000;

/**
 * Resolve o timeout efetivo para um teste:
 * - Sem override: usa o default por tipo (fallback 10s).
 * - Com override: aplica clamp em [MIN, MAX] para evitar abuso.
 */
export function resolveTimeout(type: ConnectionType, override?: number | null): number {
  const base = DEFAULT_TIMEOUTS_MS[type] ?? 10000;
  if (override == null || !Number.isFinite(override)) return base;
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.round(override)));
}
