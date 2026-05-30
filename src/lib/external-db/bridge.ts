/**
 * External DB Bridge — Core invocation layer.
 *
 * ARCHITECTURE (Phase 4, 2026-05-30):
 *   1. invokeExternalDb: tries REST native FIRST (fast path, no kill-switch check).
 *      Only checks kill-switch if REST native is NOT eligible.
 *   2. invokeBatchBridge: on KillSwitchActiveError, decomposes batch into
 *      individual calls with concurrency cap (6 parallel max).
 *   3. Bridge code (invokeBridge, retry logic) kept for emergency rollback
 *      but is effectively dead code at 100% REST native.
 *
 * Kill-switch state: enabled=false, rollout=100 → 100% REST native.
 * Rollback: UPDATE system_kill_switches SET enabled = true WHERE switch_name = 'edge_external_db_bridge';
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { emitBridgeStatus, isColdStartSignal } from './bridge-status-events';
import { getKillSwitchState, KillSwitchActiveError, invalidateKillSwitchCache } from './kill-switch-client';
import { tryExecuteRestNative, isRestNativeEligible, runWithConcurrency } from './rest-native';

const KILL_SWITCH_NAME = 'edge_external_db_bridge';

export type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'batch_insert';

export interface InvokeOptions<T = Record<string, unknown>> {
  table: string;
  operation: Operation;
  data?: T;
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}

export interface InvokeResult<T> {
  records: T[];
  count: number | null;
}

export interface BridgeResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BatchQuery {
  table: string;
  operation?: 'select';
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  cacheKey?: string;
}

export interface BatchResult {
  success: boolean;
  data?: { records: unknown[]; count: number | null };
  error?: string;
  fromCache?: boolean;
}

// ── Bridge invocation (legacy, kept for rollback) ───────────────────

const BOOT_RETRY_ATTEMPTS = 4;
const BOOT_INITIAL_BACKOFF_MS = 400;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function buildBridgeError(error: unknown): Promise<{ message: string; retryable: boolean }> {
  let baseMessage = 'Erro desconhecido';
  let status: number | undefined;
  let responseBody = '';
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; context?: Response };
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) baseMessage = maybeError.message;
    if (maybeError.context instanceof Response) {
      status = maybeError.context.status;
      try { responseBody = await maybeError.context.clone().text(); } catch { /* ignore */ }
    }
  }
  const diagnostic = `${baseMessage} ${responseBody}`.toLowerCase();
  const retryable = status === 502 || status === 503 || status === 504 ||
    diagnostic.includes('boot_error') || diagnostic.includes('bad gateway') ||
    diagnostic.includes('function failed to start') || diagnostic.includes('statement timeout') ||
    diagnostic.includes('57014') || diagnostic.includes('supabase_edge_runtime_error') ||
    diagnostic.includes('service is temporarily unavailable') || diagnostic.includes('functionshttperror') ||
    diagnostic.includes('failed to fetch') || diagnostic.includes('network');
  const details = responseBody ? `${baseMessage} | ${responseBody}` : baseMessage;
  return { message: `Erro na bridge: ${details}`, retryable };
}

function isCorsOrNetworkBridgeError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('failed to send a request to the edge function') ||
    lower.includes('err_failed') || lower.includes('cors') ||
    lower.includes('x-application-name') || lower.includes('preflight');
}

export async function invokeBridge<T>(body: Record<string, unknown>): Promise<BridgeResponse<T>> {
  const op = body.operation as string | undefined;
  if (op !== 'batch' && (!body.table || typeof body.table !== 'string')) {
    throw new Error(`invokeBridge: tabela nao informada (operation=${op})`);
  }
  try {
    const switchState = await getKillSwitchState(KILL_SWITCH_NAME);
    if (!switchState.enabled) {
      const friendly = switchState.message ?? 'Bridge OFF. REST nativo ativo.';
      emitBridgeStatus({ type: 'unavailable', reason: `kill-switch: ${friendly}`, attempts: 0 });
      throw new KillSwitchActiveError(KILL_SWITCH_NAME, friendly);
    }
  } catch (err) {
    if (err instanceof KillSwitchActiveError) throw err;
  }
  let sawColdStart = false;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  for (let attempt = 1; attempt <= BOOT_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', { body, headers });
    if (error) {
      const parsed = await buildBridgeError(error);
      if (isCorsOrNetworkBridgeError(parsed.message)) invalidateKillSwitchCache(KILL_SWITCH_NAME);
      if (parsed.retryable && attempt < BOOT_RETRY_ATTEMPTS) {
        const base = BOOT_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 150);
        const delay = Math.min(base + jitter, 4000);
        if (isColdStartSignal(parsed.message)) {
          sawColdStart = true;
          emitBridgeStatus({ type: 'degraded', attempt, maxAttempts: BOOT_RETRY_ATTEMPTS, delayMs: delay, baseDelayMs: base, jitterMs: jitter, reason: parsed.message });
        }
        await sleep(delay);
        continue;
      }
      if (isColdStartSignal(parsed.message)) emitBridgeStatus({ type: 'unavailable', reason: parsed.message, attempts: attempt });
      throw new Error(parsed.message);
    }
    if (!data?.success) throw new Error(data?.error || 'Erro desconhecido no banco externo');
    if (sawColdStart) emitBridgeStatus({ type: 'recovered' });
    return data as BridgeResponse<T>;
  }
  throw new Error('Erro na bridge: tentativas esgotadas');
}

// ── Batch bridge ────────────────────────────────────────────────────

const BATCH_MAX_QUERIES = 10;

function extractBatchResults(payload: unknown): BatchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const directResults = (payload as { results?: BatchResult[] }).results;
  if (Array.isArray(directResults)) return directResults;
  const nestedResults = (payload as { data?: { results?: BatchResult[] } }).data?.results;
  if (Array.isArray(nestedResults)) return nestedResults;
  return [];
}

/**
 * Decomposes batch queries into individual invokeExternalDb calls.
 * Uses concurrency limiter (Etapa 4) to prevent connection pool exhaustion.
 */
async function decomposeBatchToIndividual(queries: BatchQuery[]): Promise<BatchResult[]> {
  logger.info(
    `[external-db] Decomposing ${queries.length} batch queries (concurrency=6)`,
  );
  const tasks = queries.map((q) => async (): Promise<BatchResult> => {
    try {
      const result = await invokeExternalDb<Record<string, unknown>>({
        table: q.table,
        operation: q.operation ?? 'select',
        select: q.select,
        filters: q.filters,
        orderBy: q.orderBy,
        limit: q.limit,
        offset: q.offset,
      });
      return { success: true, data: { records: result.records, count: result.count } };
    } catch (e) {
      logger.warn(`[external-db] Batch decompose: ${q.table} failed: ${(e as Error).message}`);
      return { success: false, error: (e as Error).message };
    }
  });

  const settled = await runWithConcurrency(tasks);
  return settled.map((r) =>
    r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' },
  );
}

export async function invokeBatchBridge(queries: BatchQuery[]): Promise<BatchResult[]> {
  try {
    if (queries.length <= BATCH_MAX_QUERIES) {
      const response = await invokeBridge<{ results: BatchResult[] }>({ operation: 'batch', queries });
      const parsedResults = extractBatchResults(response);
      if (parsedResults.length === 0 && queries.length > 0) throw new Error('Resposta invalida da batch bridge');
      return parsedResults;
    }
    const results: BatchResult[] = [];
    for (let i = 0; i < queries.length; i += BATCH_MAX_QUERIES) {
      const chunk = queries.slice(i, i + BATCH_MAX_QUERIES);
      const response = await invokeBridge<{ results: BatchResult[] }>({ operation: 'batch', queries: chunk });
      const parsedResults = extractBatchResults(response);
      if (parsedResults.length === 0 && chunk.length > 0) throw new Error('Resposta invalida da batch bridge');
      results.push(...parsedResults);
    }
    return results;
  } catch (err) {
    if (err instanceof KillSwitchActiveError) return decomposeBatchToIndividual(queries);
    if (err instanceof Error && isCorsOrNetworkBridgeError(err.message)) {
      logger.warn('[external-db] Bridge unreachable, attempting batch decompose fallback');
      return decomposeBatchToIndividual(queries);
    }
    throw err;
  }
}

// ── CRUD (Etapa 5: REST native FIRST, kill-switch only on fallback) ─

/**
 * Smart routing (Phase 4, inverted path):
 *   1. If eligible → try REST native immediately (no kill-switch check)
 *   2. If REST native succeeds → return (fast path, zero overhead)
 *   3. If REST native fails OR not eligible → check kill-switch
 *   4. If bridge enabled → try bridge
 *   5. If bridge disabled → return empty
 *
 * This eliminates the kill-switch DB query for 100% of eligible requests.
 */
export async function invokeExternalDb<T>(options: InvokeOptions): Promise<InvokeResult<T>> {
  // Fast path: REST native first (no kill-switch check)
  if (isRestNativeEligible(options)) {
    const restResult = await tryExecuteRestNative<T>(options);
    if (restResult !== null) return restResult;
    // REST native failed — fall through to bridge/kill-switch check
  }

  // Slow path: check kill-switch, try bridge
  let bridgeEnabled = true;
  try {
    const switchState = await getKillSwitchState(KILL_SWITCH_NAME);
    bridgeEnabled = switchState.enabled;
  } catch {
    bridgeEnabled = true; // fail-open
  }

  if (!bridgeEnabled) {
    logger.warn(
      `[external-db] Bridge OFF and REST native unavailable for ${options.table}/${options.operation}. Returning empty.`,
    );
    return { records: [], count: 0 };
  }

  // Bridge path (legacy fallback)
  const response = await invokeBridge<InvokeResult<T> | T>(options as unknown as Record<string, unknown>);
  const payload = response.data;
  if (options.operation !== 'select' && payload && typeof payload === 'object' && !Array.isArray(payload) && !('records' in payload)) {
    return { records: [payload as T], count: 1 };
  }
  return payload as InvokeResult<T>;
}

export async function invokeExternalDbSingle<T>(options: InvokeOptions): Promise<T> {
  const result = await invokeExternalDb<T>(options);
  if (!result.records?.length) throw new Error('Nenhum registro retornado');
  return result.records[0];
}

export async function invokeExternalDbDelete(table: string, id: string): Promise<void> {
  await invokeBridge<{ success: boolean; deleted_id: string }>({ table, operation: 'delete', id });
}
