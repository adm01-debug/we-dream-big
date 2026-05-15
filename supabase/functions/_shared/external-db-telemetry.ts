// supabase/functions/_shared/external-db-telemetry.ts
// Query performance telemetry for external-db-bridge

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const SLOW_QUERY_THRESHOLD_MS = 3000;
export const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

export type ErrorKind =
  | 'timeout'
  | 'postgrest_error'
  | 'validation'
  | 'network'
  | 'rate_limit'
  | 'auth'
  | 'unknown';

export interface TelemetryMeta {
  operation: string;
  table?: string;
  rpcName?: string;
  limit?: number;
  offset?: number;
  countMode?: string;
  durationMs: number;
  recordCount?: number;
  status: 'ok' | 'error' | 'slow' | 'very_slow';
  error?: string;
  errorKind?: ErrorKind | null;
  userId?: string | null;
  retryCount?: number;
  cacheHit?: boolean;
  /** True quando a falha veio do isolate booting (SUPABASE_EDGE_RUNTIME_ERROR / boot_error). */
  isColdStart?: boolean;
  /** True para qualquer 5xx de plataforma (502/503/504). */
  is503?: boolean;
}

const COLD_START_PATTERNS = [
  'supabase_edge_runtime_error',
  'service is temporarily unavailable',
  'boot_error',
  'function failed to start',
];

export function detectPlatformFailure(error: string | undefined | null): { is503: boolean; isColdStart: boolean } {
  if (!error) return { is503: false, isColdStart: false };
  const msg = error.toLowerCase();
  const is503 = msg.includes('503') || msg.includes('502') || msg.includes('504') || msg.includes('bad gateway');
  const isColdStart = COLD_START_PATTERNS.some(p => msg.includes(p));
  return { is503: is503 || isColdStart, isColdStart };
}

// Classifica error_message bruto em uma categoria estável.
// Heurística determinística — baseada em padrões observados no postgrest/deno.
export function classifyErrorKind(error: string | undefined | null, status?: TelemetryMeta['status']): ErrorKind | null {
  if (status === 'ok' || status === 'slow' || status === 'very_slow') return null;
  if (!error) return status === 'error' ? 'unknown' : null;
  const msg = error.toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout') || msg.includes('57014')) return 'timeout';
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) return 'rate_limit';
  if (msg.includes('jwt') || msg.includes('unauthor') || msg.includes('401') || msg.includes('403') || msg.includes('forbidden')) return 'auth';
  if (msg.includes('validation') || msg.includes('zod') || msg.includes('invalid input') || msg.includes('400')) return 'validation';
  if (msg.includes('pgrst') || msg.includes('postgrest') || msg.includes('relation ') || msg.includes('column ') || msg.includes('syntax error')) return 'postgrest_error';
  if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('network') || msg.includes('socket') || msg.includes('dns')) return 'network';
  return 'unknown';
}

export function emitTelemetry(meta: TelemetryMeta) {
  const icon = meta.status === 'very_slow' ? '🔴' : meta.status === 'slow' ? '🟡' : meta.status === 'error' ? '❌' : '✅';
  const target = meta.rpcName || meta.table || 'unknown';
  const line = `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms | records=${meta.recordCount ?? '-'} limit=${meta.limit ?? '-'} offset=${meta.offset ?? '-'} count=${meta.countMode ?? '-'}`;

  if (meta.status === 'very_slow') console.warn(`⚠️ VERY SLOW QUERY: ${line}`);
  else if (meta.status === 'slow') console.warn(`⚠️ SLOW QUERY: ${line}`);
  else if (meta.status === 'error') console.error(line + ` error=${meta.error}`);
  else console.info(line);

  // Persist slow/error queries (fire-and-forget) — also persists cache hits & retry savings for analytics.
  const platform = detectPlatformFailure(meta.error);
  const isColdStart = meta.isColdStart ?? platform.isColdStart;
  const is503 = meta.is503 ?? platform.is503;
  const shouldPersist =
    meta.status !== 'ok' ||
    meta.cacheHit === true ||
    (meta.retryCount ?? 0) > 0 ||
    is503 || isColdStart;

  if (shouldPersist) {
    try {
      const localUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (localUrl && serviceKey) {
        const localClient = createClient(localUrl, serviceKey);
        const errorKind = meta.errorKind === undefined
          ? classifyErrorKind(meta.error, meta.status)
          : meta.errorKind;
        localClient.from('query_telemetry').insert({
          operation: meta.operation,
          table_name: meta.table || null,
          rpc_name: meta.rpcName || null,
          duration_ms: meta.durationMs,
          record_count: meta.recordCount ?? null,
          query_limit: meta.limit ?? null,
          query_offset: meta.offset ?? null,
          count_mode: meta.countMode || null,
          severity: meta.status,
          error_message: meta.error || null,
          error_kind: errorKind,
          user_id: meta.userId || null,
          retry_count: meta.retryCount ?? 0,
          cache_hit: meta.cacheHit ?? false,
          is_503: is503,
          is_cold_start: isColdStart,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.warn('[telemetry-persist] Insert failed:', insertErr.message);
        });
      }
    } catch (_e) {
      // Fire-and-forget
    }
  }
}

export function classifyDuration(durationMs: number): 'ok' | 'slow' | 'very_slow' {
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return 'very_slow';
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return 'slow';
  return 'ok';
}
