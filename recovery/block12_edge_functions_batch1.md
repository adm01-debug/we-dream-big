# Bloco 12 — Edge Functions (Lote 1/N)

**Total de Edge Functions no projeto:** 87
**Lote atual:** 5 funções críticas (CRM/External DB/Bitrix sync)

## Configuração global

### `supabase/config.toml`
```toml
project_id = "jlpkghroyzkmseixtjxv"
```

**Nota sobre `verify_jwt`:** o `config.toml` deste projeto contém apenas `project_id`.
Nenhum bloco `[functions.<name>]` foi declarado, então **TODAS as 87 funções são deployadas com o default do sistema** (`verify_jwt = false`, conforme política Lovable Cloud com signing-keys + getClaims em código).

Cada função abaixo valida JWT internamente quando necessário (via `auth.ts`/`authorize.ts`/`getClaims`).

---

## Funções desta entrega

| # | Função | verify_jwt | Auth interna | Tamanho |
|---|--------|------------|--------------|---------|
| 1 | crm-db-bridge | false (default) | sim (JWT + RBAC) | 39.8 KB |
| 2 | external-db-bridge | false (default) | sim (JWT + scopes) | 85.6 KB |
| 3 | quote-sync | false (default) | service-role + Zod | 13.0 KB |
| 4 | sync-quote-bitrix | false (default) | service-role | 13.8 KB |
| 5 | bitrix-sync | false (default) | service-role + circuit breaker | 22.6 KB |

---

## 📦 `supabase/functions/crm-db-bridge/index.ts`

**Secrets/env vars referenciadas:**

- `LOG_CRM_BRIDGE_VERBOSE`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Código fonte completo:**

```typescript
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { runBotProtection } from '../_shared/bot-protection.ts';
import { getBreaker, circuitOpenResponse, getAllBreakerStatuses } from '../_shared/circuit-breaker.ts';
import { AsyncLocalStorage } from "node:async_hooks";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { resolveCredential, buildCredentialsHealth } from "../_shared/credentials.ts";

const breaker = getBreaker("crm-db");

// Contexto async por-request — garante isolamento mesmo com requisições concorrentes.
// Cada handler.run() instala um requestId na chain; jsonResponse lê dele.
const requestCtx = new AsyncLocalStorage<{ requestId: string }>();
function currentRequestId(): string | undefined {
  return requestCtx.getStore()?.requestId;
}

// ============================================
// CRM CLIENT — singleton por isolate + warm-up no boot
// ============================================
// Mesma estratégia da external-db-bridge (1 client por isolate, fetch keep-alive
// mantém socket TLS aberto). Antes desta otimização cada request criava um novo
// client (linha ~627), pagando handshake TLS + auth a cada chamada paralela.
// Profile do dashboard mostrava 2.66s de cold-start no primeiro hit ao CRM.
let cachedCrmClient: SupabaseClient | null = null;
let crmWarmupPromise: Promise<void> | null = null;
let crmWarmupCompleted = false;

// ─── Métricas de cold vs warm path (vida do isolate) ──────────────────
// Todas em ms; null quando ainda não medido. Reiniciam a cada cold start
// porque o isolate inteiro é descartado pelo runtime entre invocações ociosas.
const isolateBootedAt = Date.now();              // wall-clock do boot
const isolateMonoStart = performance.now();      // monotônico, base para deltas
let clientBuildMs: number | null = null;         // tempo p/ instanciar o SupabaseClient
let warmupStartedAtMs: number | null = null;     // delta desde boot quando warmup começou
let warmupMs: number | null = null;              // duração do warmup query
let warmupOk = false;
let warmupError: string | null = null;
let firstRequestMs: number | null = null;        // duração da 1ª request real (pós-boot)
let firstRequestStartedAtMs: number | null = null; // delta desde boot quando 1ª request entrou
let requestCount = 0;                            // total de requests recebidas pelo isolate
let coldRequestCount = 0;                        // requests marcadas como was_cold

function buildCrmClient(url: string, key: string): SupabaseClient {
  const t0 = performance.now();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Só registra a primeira construção (singleton) — chamadas subsequentes não acontecem.
  if (clientBuildMs === null) {
    clientBuildMs = Math.round(performance.now() - t0);
    console.log(`[crm-boot] client_build_ms=${clientBuildMs}`);
  }
  return client;
}

export async function getCrmClient(): Promise<SupabaseClient | null> {
  if (cachedCrmClient) return cachedCrmClient;
  // SSOT: DB-first via integration_credentials, fallback to legacy env aliases
  // (CRM_SUPABASE_URL / CRM_SUPABASE_SERVICE_KEY / CRM_SUPABASE_ANON_KEY).
  const [{ value: url }, { value: serviceKey }, { value: anonKey }] = await Promise.all([
    resolveCredential("EXTERNAL_CRM_URL"),
    resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
    resolveCredential("EXTERNAL_CRM_ANON_KEY"),
  ]);
  const key = serviceKey ?? anonKey;
  if (!url || !key) return null;
  cachedCrmClient = buildCrmClient(url, key);
  return cachedCrmClient;
}

/**
 * Test-only: snapshot do estado de boot do client. Usado para asserções em
 * testes de concorrência (garantir que o singleton é construído uma única vez).
 */
export function __getClientBootStateForTests() {
  return {
    cached: cachedCrmClient,
    clientBuildMs,
  };
}

/**
 * Warm-up no boot do isolate — abre TLS + handshake PostgREST em paralelo
 * ao Deno.serve. Não bloqueia o handler; idempotente.
 *
 * Faz `select id from companies limit 1` (tabela quente conhecida) — mesmo
 * shape que o `prewarmExternalDb` chama no front, então o cache HTTP do
 * PostgREST schema já fica preparado para a primeira request real.
 */
function warmupCrmClient(): Promise<void> {
  if (crmWarmupPromise) return crmWarmupPromise;
  warmupStartedAtMs = Math.round(performance.now() - isolateMonoStart);
  crmWarmupPromise = (async () => {
    const t0 = performance.now();
    try {
      const client = await getCrmClient();
      if (!client) {
        warmupError = 'CRM_SUPABASE_URL/KEY not configured';
        console.warn(`[crm-boot-warmup] ⚠️ ${warmupError}`);
        warmupMs = Math.round(performance.now() - t0);
        return;
      }
      const { error } = await client.from('companies').select('id').limit(1);
      warmupMs = Math.round(performance.now() - t0);
      if (error) {
        warmupError = error.message;
        console.warn(`[crm-boot-warmup] ⚠️ warmup_ms=${warmupMs} error="${error.message}"`);
      } else {
        warmupOk = true;
        crmWarmupCompleted = true;
        console.log(
          `[crm-boot-warmup] ✅ ready client_build_ms=${clientBuildMs} ` +
            `warmup_started_at_ms=${warmupStartedAtMs} warmup_ms=${warmupMs}`,
        );
      }
    } catch (e) {
      warmupMs = Math.round(performance.now() - t0);
      warmupError = e instanceof Error ? e.message : String(e);
      console.warn(`[crm-boot-warmup] ⚠️ warmup_ms=${warmupMs} ${warmupError}`);
    }
  })();
  return crmWarmupPromise;
}

// Dispara warm-up no boot do isolate (não-bloqueante).
warmupCrmClient();


// ============================================
// CORS
// ============================================

// CORS headers are now dynamic — initialized per-request in Deno.serve
// See _shared/cors.ts for the centralized configuration
let corsHeaders: Record<string, string> = {};

function jsonResponse(body: unknown, status = 200): Response {
  const reqId = currentRequestId();
  // Injeta request_id no body (objeto) e no header — permite ao client
  // correlacionar com os logs do servidor sem mudar o shape esperado.
  let finalBody: unknown = body;
  if (reqId && body && typeof body === "object" && !Array.isArray(body)) {
    finalBody = { ...(body as Record<string, unknown>), request_id: reqId };
  }
  const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (reqId) headers[REQUEST_ID_HEADER] = reqId;
  return new Response(JSON.stringify(finalBody), { status, headers });
}

type DiagOp = "ping" | "diag" | "breaker_status" | "creds_health";

/**
 * Detecta operações de diagnóstico (`ping` | `diag` | `breaker_status` |
 * `creds_health`) sem consumir o body original. Aceita querystring
 * (`?op=…`, `?ping=1`, `?diag=1`, `?breaker=1`, `?creds=1`) ou body JSON
 * `{ "operation": "…" }`.
 */
async function detectDiagOp(req: Request): Promise<DiagOp | null> {
  // Query string
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op");
    if (op === "ping" || op === "diag" || op === "breaker_status" || op === "creds_health") return op;
    if (url.searchParams.get("ping") === "1") return "ping";
    if (url.searchParams.get("diag") === "1") return "diag";
    if (url.searchParams.get("breaker") === "1") return "breaker_status";
    if (url.searchParams.get("creds") === "1") return "creds_health";
  } catch { /* ignore */ }

  // Body JSON (POST/PUT/PATCH apenas; clonamos para não consumir o original)
  if (req.method !== "GET" && req.method !== "HEAD") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const cloned = req.clone();
        const peek = await cloned.json() as { operation?: unknown };
        if (peek?.operation === "ping" || peek?.operation === "diag" || peek?.operation === "breaker_status" || peek?.operation === "creds_health") {
          return peek.operation as DiagOp;
        }
      } catch { /* corpo inválido — não é diag */ }
    }
  }
  return null;
}

/**
 * Snapshot do estado de resolução das credenciais CRM, sem expor valores.
 * Bypass auth (igual a ping/diag/breaker_status) — operadores precisam
 * conseguir checar saúde mesmo se JWT/secrets estiverem quebrados.
 *
 * Lógica de agregação está em `_shared/credentials.ts:buildCredentialsHealth`
 * para reuso por outras edge functions (quote-sync, expert-chat, etc).
 */
async function buildCredsHealthSnapshot() {
  return await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ]);
}

/**
 * Snapshot completo de métricas de boot/runtime do isolate atual.
 * Cada isolate tem sua própria vida — quando o runtime descarta o isolate
 * por ociosidade, o próximo cold start gera novos valores.
 */
function buildDiagSnapshot() {
  const now = Date.now();
  return {
    ok: true,
    ts: now,
    warm: crmWarmupCompleted,
    isolate: {
      booted_at: isolateBootedAt,
      age_ms: now - isolateBootedAt,
      request_count: requestCount,
      cold_request_count: coldRequestCount,
    },
    boot: {
      client_build_ms: clientBuildMs,
      warmup_started_at_ms: warmupStartedAtMs,
      warmup_ms: warmupMs,
      warmup_ok: warmupOk,
      warmup_error: warmupError,
    },
    runtime: {
      first_request_started_at_ms: firstRequestStartedAtMs,
      first_request_ms: firstRequestMs,
    },
  };
}


// ============================================
// CONSTANTS
// ============================================

const ALLOWED_TABLES = [
  "companies", "contacts", "company_addresses", "company_social_media",
  "contact_emails", "contact_phones", "customers", "suppliers", "carriers",
];

const VENDOR_WRITE_TABLES: string[] = [];

const OPTIONAL_QUOTE_TABLES = new Set<string>();

// ============================================
// TYPE-SAFE RESULT HELPERS
// ============================================

/**
 * Narrow an unknown value (which may also be a PostgREST GenericStringError
 * or any other non-row payload) to a plain Record<string, unknown>.
 * Returns null when the value is not a usable row object.
 */
export function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  // PostgREST GenericStringError has shape { error: true; message: string }
  // and should never be treated as a row.
  const maybeErr = value as { error?: unknown; message?: unknown };
  if (maybeErr.error === true && typeof maybeErr.message === "string") return null;
  return value as Record<string, unknown>;
}

/**
 * Safely access the first row of a PostgREST result (`data` from `.select()`),
 * which Supabase types as `T[] | null` but at runtime can also surface
 * `GenericStringError`-like payloads when selectors fail. Returns null
 * unless the first element is a real row object.
 */
export function firstRowAsRecord(result: unknown): Record<string, unknown> | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  return toRecord(result[0]);
}

/**
 * Classify the shape of a PostgREST `data` payload returned by an
 * insert/update so we can log clearly when it is NOT a real row array.
 *
 * Possible shapes:
 *  - "rows"        → expected: Array<Record>
 *  - "empty-array" → [] returned (no rows affected, no error)
 *  - "null"        → null returned
 *  - "generic-string-error" → { error: true, message: "..." } (PostgREST shape)
 *  - "single-object"        → object returned instead of array (.single()/.maybeSingle())
 *  - "primitive"            → string/number/boolean
 *  - "unknown"              → anything else
 */
export type InsertResultShape =
  | "rows"
  | "empty-array"
  | "null"
  | "generic-string-error"
  | "single-object"
  | "primitive"
  | "unknown";

export interface InsertResultDiagnostic {
  shape: InsertResultShape;
  rowCount: number;
  /** Stringified preview of the payload (truncated) for log readability. */
  preview: string;
  /** Extracted message when shape is "generic-string-error". */
  errorMessage?: string;
}

const PREVIEW_MAX = 400;

function previewValue(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return String(value);
    return json.length > PREVIEW_MAX ? `${json.slice(0, PREVIEW_MAX)}…` : json;
  } catch {
    return String(value);
  }
}

export function inspectInsertResult(value: unknown): InsertResultDiagnostic {
  if (value === null) return { shape: "null", rowCount: 0, preview: "null" };
  if (value === undefined) return { shape: "null", rowCount: 0, preview: "undefined" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { shape: "empty-array", rowCount: 0, preview: "[]" };
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const maybeErr = first as { error?: unknown; message?: unknown };
      if (maybeErr.error === true && typeof maybeErr.message === "string") {
        return {
          shape: "generic-string-error",
          rowCount: value.length,
          preview: previewValue(value),
          errorMessage: maybeErr.message,
        };
      }
      return { shape: "rows", rowCount: value.length, preview: previewValue(value) };
    }
    return { shape: "unknown", rowCount: value.length, preview: previewValue(value) };
  }

  if (typeof value === "object") {
    const maybeErr = value as { error?: unknown; message?: unknown };
    if (maybeErr.error === true && typeof maybeErr.message === "string") {
      return {
        shape: "generic-string-error",
        rowCount: 0,
        preview: previewValue(value),
        errorMessage: maybeErr.message,
      };
    }
    return { shape: "single-object", rowCount: 1, preview: previewValue(value) };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { shape: "primitive", rowCount: 0, preview: previewValue(value) };
  }
  return { shape: "unknown", rowCount: 0, preview: previewValue(value) };
}

/**
 * Emit a structured log line whenever an insert/update result is not a
 * regular array of rows. This makes runtime debugging of GenericStringError
 * (and other unexpected shapes) trivial — search logs for `result-shape-anomaly`.
 *
 * Returns true if an anomaly was logged.
 */
export function logInsertResultIfAnomalous(
  context: { callSite: string; table: string; operation: "insert" | "update"; returning?: string },
  diagnostic: InsertResultDiagnostic,
): boolean {
  if (diagnostic.shape === "rows") return false;

  const payload = {
    event: "result-shape-anomaly",
    callSite: context.callSite,
    operation: context.operation,
    table: context.table,
    returning: context.returning ?? "*",
    shape: diagnostic.shape,
    rowCount: diagnostic.rowCount,
    errorMessage: diagnostic.errorMessage,
    preview: diagnostic.preview,
  };

  const icon = diagnostic.shape === "generic-string-error" ? "🚨" : "⚠️";
  console.error(
    `[crm-db-bridge] ${icon} result-shape-anomaly op=${context.operation} table=${context.table} ` +
      `shape=${diagnostic.shape}` +
      (diagnostic.errorMessage ? ` message="${diagnostic.errorMessage}"` : "") +
      ` → ${JSON.stringify(payload)}`,
  );
  return true;
}


interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete" | "batch";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  relations?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
  queries?: BatchQuery[];
}

interface BatchQuery {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
}

interface AuthResult {
  userId: string | null;
  userRole: string;
  error?: Response;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

// ============================================
// AUTH
// ============================================

async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Autenticação necessária" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (!user || userError) {
    console.error("CRM auth failed:", userError?.message);
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Token inválido ou expirado" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient
    .from("user_roles").select("role").eq("user_id", user.id).single();

  const userRole = roleData?.role || "vendedor";
  console.log(`Request from user: ${user.id}, role: ${userRole}`);
  return { userId: user.id, userRole };
}

// ============================================
// FILTER BUILDER (shared by all operations)
// ============================================

function applyFilters(query: any, filters: Record<string, unknown>): any {
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === "object" && value !== null) {
      const f = value as Record<string, unknown>;
      if ("in" in f) query = query.in(key, f.in as unknown[]);
      if ("ilike" in f) query = query.ilike(key, f.ilike as string);
      if ("eq" in f) query = query.eq(key, f.eq);
      if ("neq" in f) query = query.neq(key, f.neq as string);
      if ("gt" in f) query = query.gt(key, f.gt as string);
      if ("gte" in f) query = query.gte(key, f.gte as string);
      if ("lt" in f) query = query.lt(key, f.lt as string);
      if ("lte" in f) query = query.lte(key, f.lte as string);
      if ("not_null" in f) query = query.not(key, "is", null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function applyOrdering(query: any, orderBy: string | { column: string; ascending?: boolean }): any {
  if (typeof orderBy === "string") {
    return query.order(orderBy);
  }
  return query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
}

// ============================================
// OPTIONAL QUOTES MODULE FALLBACKS
// ============================================

function isOptionalQuoteTable(table: string): boolean {
  return OPTIONAL_QUOTE_TABLES.has(table);
}

function isMissingTableError(error: PostgrestLikeError | null | undefined, table: string): boolean {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "PGRST205" || message.includes(`Could not find the table 'public.${table}' in the schema cache`);
}

function getOptionalTableMessage(table: string): string {
  return `Módulo de orçamentos indisponível no CRM externo (${table})`;
}

function createOptionalSelectFallback(table: string, isSingleRecord = false): Response {
  const warning = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${warning} — retornando fallback vazio para leitura.`);

  return jsonResponse({
    data: isSingleRecord ? null : [],
    count: 0,
    unavailable: true,
    warning,
  });
}

function createOptionalWriteError(table: string): Response {
  const error = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${error} — bloqueando operação de escrita.`);
  return jsonResponse({ error }, 503);
}

// ============================================
// QUOTE NUMBER GENERATOR
// ============================================

async function generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const now = new Date();
  const yearShort = String(now.getFullYear()).slice(-2);

  const { data: lastQuotes } = await crm
    .from("quotes")
    .select("quote_number")
    .ilike("quote_number", `%/${yearShort}`)
    .order("quote_number", { ascending: false })
    .limit(50);

  let maxNum = 10000;
  if (lastQuotes?.length) {
    for (const row of lastQuotes) {
      const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
  }

  const generatedNumber = `${maxNum + 1}/${yearShort}`;
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    if (!row.quote_number || row.quote_number === "") {
      row.quote_number = generatedNumber;
    }
  }
}

// ============================================
// OPERATION HANDLERS
// ============================================

async function handleBatch(crm: SupabaseClient, queries: BatchQuery[]): Promise<Response> {
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: "Batch limited to 10 queries max" }, 400);
  }

  const batchStart = performance.now();
  const results = await Promise.all(
    queries.map(async (q, idx) => {
      if (!q.table || !ALLOWED_TABLES.includes(q.table)) {
        return { success: false, error: `Table '${q.table}' not allowed` };
      }
      try {
        const queryStart = performance.now();
        let query = crm.from(q.table).select(q.select || "*");

        if (q.filters) query = applyFilters(query, q.filters);
        if (q.search?.column && q.search?.term) {
          query = query.ilike(q.search.column, `%${q.search.term}%`);
        }
        if (q.orderBy) query = applyOrdering(query, q.orderBy);
        if (q.limit) query = query.limit(q.limit);
        if (q.offset) query = query.range(q.offset, q.offset + (q.limit || 50) - 1);

        const { data, error } = await query;
        const duration = Math.round(performance.now() - queryStart);

        if (error) {
          if (isOptionalQuoteTable(q.table) && isMissingTableError(error, q.table)) {
            const warning = getOptionalTableMessage(q.table);
            console.warn(`[batch] Query ${idx} (${q.table}) optional table missing — fallback vazio.`);
            return {
              success: true,
              unavailable: true,
              warning,
              data: { records: [], count: 0 },
            };
          }

          console.error(`[batch] Query ${idx} (${q.table}) error: ${error.message}`);
          return { success: false, error: error.message };
        }
        console.log(`[batch] Query ${idx} (${q.table}) ${duration}ms, ${(data || []).length} records`);
        return { success: true, data: { records: data || [], count: (data || []).length } };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
      }
    })
  );

  console.log(`[batch] Total: ${Math.round(performance.now() - batchStart)}ms for ${queries.length} queries`);
  return jsonResponse({ success: true, results });
}

async function handleInsert(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, data, returning } = body;
  if (!data) return jsonResponse({ error: "Insert requires 'data' field" }, 400);

  if (table === "quotes") {
    await generateQuoteNumber(crm, data);
  }

  const { data: result, error } = await crm.from(table).insert(data as any).select(returning || "*");

  // Diagnose result shape BEFORE doing anything else so GenericStringError
  // payloads (and other anomalies) are visible immediately in runtime logs.
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleInsert", table, operation: "insert", returning: returning || "*" },
      diag,
    );
  }

  // Fix quote_number if it was overridden by DB default
  if (!error && table === "quotes") {
    const insertedRow = firstRowAsRecord(result);
    if (insertedRow) {
      const sourceRow = Array.isArray(data) ? toRecord(data[0]) : toRecord(data);
      const targetNumber = sourceRow?.quote_number;

      if (targetNumber && targetNumber !== "" && insertedRow.quote_number !== targetNumber) {
        await crm.from("quotes").update({ quote_number: targetNumber }).eq("id", insertedRow.id as string);
        insertedRow.quote_number = targetNumber;
      }
    }
  }

  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM insert error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleUpdate(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, data, returning } = body;
  if (!data) return jsonResponse({ error: "Update requires 'data' field" }, 400);

  let query = crm.from(table).update(data as any);

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  }

  const { data: result, error } = await query.select(returning || "*");
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleUpdate", table, operation: "update", returning: returning || "*" },
      diag,
    );
  }
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM update error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleDelete(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters } = body;
  let query = crm.from(table).delete();

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  } else {
    return jsonResponse({ error: "Delete requires 'id' or 'filters' to prevent mass deletion" }, 400);
  }

  const { error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM delete error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: null, success: true });
}

async function handleSelect(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, select, orderBy, limit, offset, search, relations } = body;
  const selectFields = select || (relations ? `${select || "*"}, ${relations}` : "*");
  
  console.log(`[SELECT] table=${table}, selectFields=${selectFields}, filters=${JSON.stringify(filters)}, limit=${limit}`);
  
  let query = crm.from(table).select(selectFields);

  if (id) {
    const { data, error } = await query.eq("id", id).single();
    if (error) {
      console.error(`[SELECT] single error: code=${error.code}, message=${error.message}, details=${JSON.stringify(error)}`);
      if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
        return createOptionalSelectFallback(table, true);
      }
      return jsonResponse({ error: error.message }, error.code === "PGRST116" ? 404 : 500);
    }
    return jsonResponse({ data, count: 1 });
  }

  if (filters) query = applyFilters(query, filters);
  if (search) query = query.ilike(search.column, `%${search.term}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit || 50) - 1);

  const { data, error, count, status, statusText } = await query;
  console.log(`[SELECT] result: status=${status}, statusText=${statusText}, dataLength=${(data || []).length}, error=${error ? JSON.stringify(error) : 'none'}, count=${count}`);
  
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: data || [], count });
}

async function handleSearch(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, search, select, orderBy, limit } = body;
  if (!search?.column || !search?.term) {
    return jsonResponse({ error: "Search requires 'column' and 'term'" }, 400);
  }

  let query = crm.from(table).select(select || "*").ilike(search.column, `%${search.term}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  query = query.limit(limit || 50);

  const { data, error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: data || [], count: data?.length || 0 });
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve((req) => {
    // Extrai/gera o request-id e roda todo o resto dentro do AsyncLocalStorage,
  // garantindo que jsonResponse() o injete em todas as respostas e logs
  // possam prefixá-lo via currentRequestId().
  const requestId = getOrCreateRequestId(req);
  return requestCtx.run({ requestId }, async () => {
    corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId } });
    }

  // ─────────────────────────────────────────────────────────────────
  // PING / DIAG — endpoints de diagnóstico SEMPRE disponíveis.
  // BYPASS deliberado de circuit-breaker, JWT, bot-protection e CRM externo.
  //
  //   GET  ?op=ping  | POST { operation:"ping" }  → { ok, ts, warm }
  //   GET  ?op=diag  | POST { operation:"diag" }  → snapshot completo de
  //     métricas de cold vs warm path do isolate atual:
  //       boot.client_build_ms    — tempo p/ instanciar o SupabaseClient
  //       boot.warmup_started_at_ms — delta desde boot quando warmup começou
  //       boot.warmup_ms          — duração do warmup query
  //       boot.warmup_ok / warmup_error
  //       runtime.first_request_ms — duração da 1ª request real pós-boot
  //       isolate.age_ms / request_count / cold_request_count
  // ─────────────────────────────────────────────────────────────────
  const diagOp = await detectDiagOp(req);
  if (diagOp === "ping") {
    return jsonResponse({ ok: true, ts: Date.now(), warm: crmWarmupCompleted });
  }
  if (diagOp === "diag") {
    return jsonResponse(buildDiagSnapshot());
  }
  if (diagOp === "breaker_status") {
    // Status de TODOS os breakers registrados neste isolate (atualmente: "crm-db").
    // Bypass total (igual a ping/diag) — precisa funcionar mesmo com breaker OPEN.
    const all = getAllBreakerStatuses();
    const primary = all.find((b) => b.name === "crm-db") ?? all[0] ?? null;
    return jsonResponse({
      ok: true,
      ts: Date.now(),
      // Forma "achatada" pedida pelo painel (estado primário do crm-db).
      state: primary?.state ?? "UNKNOWN",
      failures: primary?.failures ?? 0,
      openedAt: primary?.openedAt ?? 0,
      willResetAt: primary?.willResetAt ?? null,
      // Bloco completo + lista de todos (futuro-prova caso outro breaker seja adicionado).
      breaker: primary,
      all,
    });
  }
  if (diagOp === "creds_health") {
    return jsonResponse(await buildCredsHealthSnapshot());
  }

  // Marca início da request real (pós-diag) para medir cold vs warm path.
  // `was_cold` = true para a 1ª request real após o boot do isolate.
  const reqStartedAt = performance.now();
  const wasCold = requestCount === 0;
  requestCount++;
  if (wasCold) coldRequestCount++;
  console.log(`[crm-db-bridge] [req_id=${requestId}] request_start method=${req.method} was_cold=${wasCold}`);

  if (!breaker.canRequest()) {
    return circuitOpenResponse("crm-db", corsHeaders);
  }

  try {
    // Anti-scraping: bot UA check + rate limit por IP (camada externa antes do auth)
    const protection = await runBotProtection(req, {
      endpoint: 'crm-db-bridge',
      maxRequests: 120,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    // SSOT: DB-first via integration_credentials, env fallback via aliases.
    // Antes lia Deno.env.get() direto e ignorava credenciais salvas pela UI
    // (/admin/conexoes), causando 500 mesmo após o usuário cadastrar a CRM.
    const [urlRes, svcRes, anonRes] = await Promise.all([
      resolveCredential("EXTERNAL_CRM_URL"),
      resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
      resolveCredential("EXTERNAL_CRM_ANON_KEY"),
    ]);
    const CRM_URL = urlRes.value;
    const CRM_SERVICE_KEY = svcRes.value;
    const CRM_ANON_VAL = anonRes.value;
    const CRM_KEY = CRM_SERVICE_KEY || CRM_ANON_VAL;
    if (!CRM_URL || !CRM_KEY) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    const CRM_ANON = CRM_ANON_VAL ?? "";

    // Log de resolução só na 1ª request por isolate (cold) ou se LOG_CRM_BRIDGE_VERBOSE=on.
    // Antes corria em toda request → poluía logs sem agregar info nova.
    // Use ?op=creds_health para snapshot sob demanda em qualquer momento.
    if (wasCold || Deno.env.get("LOG_CRM_BRIDGE_VERBOSE") === "on") {
      const using = CRM_SERVICE_KEY ? "SERVICE_KEY" : "ANON_KEY";
      const keySource = CRM_SERVICE_KEY ? svcRes.source : anonRes.source;
      console.log(JSON.stringify({
        evt: "crm-creds-resolved",
        url_source: urlRes.source,
        url_via_alias: urlRes.resolved_name !== "EXTERNAL_CRM_URL",
        url_prefix: CRM_URL.substring(0, 30),
        using,
        key_source: keySource,
        key_len: CRM_KEY.length,
        anon_len: CRM_ANON.length,
        keys_match: CRM_SERVICE_KEY === CRM_ANON,
        svc_last4: CRM_KEY.slice(-4),
        anon_last4: CRM_ANON.slice(-4),
      }));
    }

    // Reusa client cacheado no escopo do módulo (singleton por isolate).
    // Warm-up no boot já abriu TLS+handshake, então a primeira request não
    // paga cold-start. Em rajada paralela, fetch keep-alive evita re-handshake.
    const crm = await getCrmClient();
    if (!crm) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    // Validate body with Zod schema
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const CrmRequestSchema = z.object({
      operation: z.enum(["select", "search", "insert", "update", "delete", "batch"]),
      table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(),
      id: z.string().uuid().optional(),
      filters: z.record(z.unknown()).optional(),
      select: z.string().max(2000).optional(),
      orderBy: z.union([z.string(), z.object({ column: z.string(), ascending: z.boolean().optional() })]).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
      search: z.object({ column: z.string(), term: z.string() }).optional(),
      relations: z.string().max(2000).optional(),
      data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
      returning: z.string().max(2000).optional(),
      queries: z.array(z.record(z.unknown())).max(10).optional(),
    });

    const parsed = CrmRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const body = parsed.data as CrmQuery;
    const { operation, table } = body;

    // Write permission check for vendedores
    if (["insert", "update", "delete"].includes(operation) && auth.userRole === "vendedor") {
      if (!VENDOR_WRITE_TABLES.includes(table)) {
        return jsonResponse({ error: "Permissão insuficiente para modificar esta tabela" }, 403);
      }
    }

    // Batch handler (no table validation needed — done per-query inside)
    if (operation === "batch") {
      return handleBatch(crm, body.queries || []);
    }

    // Table whitelist
    if (!ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }, 403);
    }

    // Route to operation handler
    let response: Response;
    switch (operation) {
      case "insert": response = await handleInsert(crm, body); break;
      case "update": response = await handleUpdate(crm, body); break;
      case "delete": response = await handleDelete(crm, body); break;
      case "select": response = await handleSelect(crm, body); break;
      case "search": response = await handleSearch(crm, body); break;
      default: return jsonResponse({ error: `Operation '${operation}' not supported.` }, 400);
    }
    if (response.status >= 500) breaker.recordFailure(); else breaker.recordSuccess();

    // Captura métricas de cold vs warm path para a 1ª request real do isolate.
    const elapsed = Math.round(performance.now() - reqStartedAt);
    if (wasCold) {
      firstRequestMs = elapsed;
      firstRequestStartedAtMs = Math.round(reqStartedAt - isolateMonoStart);
      console.log(
        `[crm-runtime] [req_id=${requestId}] first_request_ms=${elapsed} was_cold=true ` +
          `op=${operation} table=${table ?? '-'} ` +
          `client_build_ms=${clientBuildMs} warmup_ms=${warmupMs} warmup_ok=${warmupOk}`,
      );
    } else {
      console.log(
        `[crm-runtime] [req_id=${requestId}] request_ms=${elapsed} was_cold=false ` +
          `op=${operation} table=${table ?? '-'} ` +
          `request_count=${requestCount}`,
      );
    }
    return response;
  } catch (error: unknown) {
    breaker.recordFailure();
    const elapsed = Math.round(performance.now() - reqStartedAt);
    console.error(
      `[crm-runtime] [req_id=${requestId}] error_ms=${elapsed} was_cold=${wasCold} ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
  });
});
```

---

## 📦 `supabase/functions/external-db-bridge/index.ts`

**Secrets/env vars referenciadas:**

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Código fonte completo:**

```typescript
// supabase/functions/external-db-bridge/index.ts
// Lean orchestrator — delegates config, aliases, telemetry and cache to shared modules.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  type ServiceClient,
  castSupabaseClient,
} from "../_shared/supabase-client-adapter.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildPublicCorsHeaders, getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import {
  type Operation,
  ALLOWED_RPCS,
  PRODUCT_TABLES, PRODUCT_VIEWS, COMPANY_TABLES, SYSTEM_TABLES,
  PERMISSIONS, SENSITIVE_TABLES,
  HEAVY_TABLES, VERY_HEAVY_TABLES,
  TABLES_WITHOUT_CREATED_AT, TABLES_WITHOUT_UPDATED_AT,
  getResourceGroup,
  type ProductTable, type ProductView,
} from "../_shared/external-db-config.ts";
import {
  resolveTableAlias,
  sanitizeExternalWriteData,
  mapTechniqueRowToLegacyShape,
  mapPriceTableRowToLegacyShape,
} from "../_shared/external-db-aliases.ts";
import { emitTelemetry, classifyDuration, VERY_SLOW_QUERY_THRESHOLD_MS, SLOW_QUERY_THRESHOLD_MS } from "../_shared/external-db-telemetry.ts";
import { getCached, setCache } from "../_shared/external-db-cache.ts";
import { getBreaker, circuitOpenResponse } from "../_shared/circuit-breaker.ts";
import { retrySupabaseCall } from "../_shared/retry-backoff.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { resolveCredential } from "../_shared/credentials.ts";

const breaker = getBreaker("external-db");

// Contexto async por-request — propaga requestId para jsonResponse() sem
// precisar passar como argumento por toda a árvore de handlers.
const requestCtx = new AsyncLocalStorage<{ requestId: string }>();
function currentRequestId(): string | undefined {
  return requestCtx.getStore()?.requestId;
}

/**
 * Transient classifier for the EXTERNAL Postgres bridge.
 * IMPORTANT: do NOT include "statement timeout" here — that path has a dedicated
 * degradation fallback (smaller limit, no count) handled downstream. Retrying
 * the same heavy query verbatim would just burn budget. We only retry true
 * connection/transport flakes here.
 */
function isBridgeTransient(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('statement timeout') || msg.includes('canceling statement')) return false;
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('connection reset') ||
    msg.includes('connection terminated') ||
    msg.includes('etimedout') ||
    msg.includes(' 503') ||
    msg.includes(' 504') ||
    msg.includes('503 ') ||
    msg.includes('504 ')
  );
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Custom error thrown when a filter value is invalid (e.g. raw object).
 * Captured at the request boundary and returned as HTTP 400 with details.
 */
class InvalidFilterError extends Error {
  field: string;
  reason: string;
  receivedType: string;
  constructor(field: string, reason: string, receivedType: string) {
    super(`Invalid filter on field "${field}": ${reason}`);
    this.name = 'InvalidFilterError';
    this.field = field;
    this.reason = reason;
    this.receivedType = receivedType;
  }
}

/**
 * Pre-validates a filters object and returns a list of violations.
 * Rejects non-plain values (objects, functions, symbols, NaN) that would otherwise
 * be coerced to "[object Object]" or break the PostgREST query.
 *
 * Allowed value types: string | number | boolean | bigint | null | undefined | Array<primitive>
 */
function validateFilters(filters: Record<string, unknown> | undefined | null): Array<{ field: string; reason: string; receivedType: string; sample: string }> {
  if (!filters || typeof filters !== 'object') return [];
  const violations: Array<{ field: string; reason: string; receivedType: string; sample: string }> = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === '') continue;

    const t = typeof value;

    // Arrays are allowed only if every element is a primitive.
    if (Array.isArray(value)) {
      const badIdx = value.findIndex(v => v !== null && (typeof v === 'object' || typeof v === 'function'));
      if (badIdx >= 0) {
        violations.push({
          field: key,
          reason: `array contains non-primitive element at index ${badIdx} (use only string/number/boolean inside arrays)`,
          receivedType: `Array<${typeof value[badIdx]}>`,
          sample: safeStringify(value).slice(0, 120),
        });
      }
      continue;
    }

    if (t === 'object') {
      violations.push({
        field: key,
        reason: 'filter value must be a primitive (string, number, boolean) — received a raw object. Use suffix promotion (e.g. `${key}_gte`) or a PostgREST string operator (e.g. "gte.10", "is.null", "in.(a,b)") instead.',
        receivedType: 'object',
        sample: safeStringify(value).slice(0, 120),
      });
      continue;
    }

    if (t === 'function' || t === 'symbol') {
      violations.push({
        field: key,
        reason: `filter value of type "${t}" is not serializable`,
        receivedType: t,
        sample: String(value).slice(0, 80),
      });
      continue;
    }

    if (t === 'number' && Number.isNaN(value as number)) {
      violations.push({
        field: key,
        reason: 'filter value is NaN',
        receivedType: 'number(NaN)',
        sample: 'NaN',
      });
    }
  }

  return violations;
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function applyFilters(
  query: any,
  filters: Record<string, unknown>,
  categoryDescendants: string[] | null,
) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (key === '_search' && typeof value === 'string') {
      const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,supplier_reference.ilike.%${escaped}%,brand.ilike.%${escaped}%,description.ilike.%${escaped}%`);
      return;
    }

    // Name prefix search: matches products whose name STARTS with the term (case insensitive)
    if (key === '_name_prefix' && typeof value === 'string') {
      const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('name', `${escaped}%`);
      return;
    }

    if (categoryDescendants && (key === 'category_id' || key === 'main_category_id')) {
      query = query.in(key, categoryDescendants);
      return;
    }

    // Suffix-based operator promotion: foo_gte → .gte('foo', val), foo_isnull → .is('foo', null|not.null)
    const suffixMatch = key.match(/^(.+)_(gte|lte|gt|lt|neq|like|ilike|isnull|notnull)$/);
    if (suffixMatch) {
      const [, col, op] = suffixMatch;
      if (op === 'isnull') { query = query.is(col, null); return; }
      if (op === 'notnull') { query = query.not(col, 'is', null); return; }
      query = query[op](col, value);
      return;
    }

    // Detect unknown suffix-style keys early (e.g. foo_isnotnull, foo_between) and log clearly.
    const unknownSuffix = key.match(/^(.+)_([a-z]+)$/);
    if (unknownSuffix && !['category', 'main', 'sub', 'group', 'price', 'created', 'updated', 'product', 'supplier', 'color', 'image'].includes(unknownSuffix[2])) {
      // Heuristic: if the suffix looks like an operator attempt but isn't whitelisted, warn but still try equality.
      const knownOps = ['gte','lte','gt','lt','neq','like','ilike','isnull','notnull','eq','in'];
      if (knownOps.some(op => unknownSuffix[2].includes(op)) && !knownOps.includes(unknownSuffix[2])) {
        console.warn(`[external-db-bridge] Unknown filter operator suffix "_${unknownSuffix[2]}" for key "${key}". Supported: ${knownOps.join(', ')}. Falling back to equality.`);
      }
    }

    if (typeof value === 'string') {
      // Support PostgREST-style is.null / not.is.null (and common variants)
      const nullVariants = ['is.null', 'isnull', 'null'];
      const notNullVariants = ['not.is.null', 'is.not.null', 'notnull', 'not.null'];
      if (nullVariants.includes(value)) { query = query.is(key, null); return; }
      if (notNullVariants.includes(value)) { query = query.not(key, 'is', null); return; }

      // Support PostgREST-style in.(val1,val2,...) operator
      const inMatch = value.match(/^in\.\((.+)\)$/);
      if (inMatch) {
        const vals = inMatch[1].split(',').map(v => v.trim());
        query = query.in(key, vals);
        return;
      }

      // Support PostgREST-style comparison operators: gte., lte., gt., lt., neq., like., ilike.
      const operatorMatch = value.match(/^(gte|lte|gt|lt|neq|like|ilike)\.(.+)$/);
      if (operatorMatch) {
        const [, op, val] = operatorMatch;
        query = query[op](key, val);
        return;
      }

      // Detect unrecognized PostgREST-style "op.value" attempts and log clearly.
      const looksLikeOperator = value.match(/^([a-z]+(?:\.[a-z]+)?)\.(.+)$/);
      if (looksLikeOperator) {
        const attemptedOp = looksLikeOperator[1];
        const knownStringOps = ['is.null','not.is.null','is.not.null','in','gte','lte','gt','lt','neq','like','ilike'];
        if (!knownStringOps.includes(attemptedOp)) {
          console.warn(`[external-db-bridge] Unknown PostgREST-style operator "${attemptedOp}" in value for key "${key}". Supported: ${knownStringOps.join(', ')}. Treating as literal equality.`);
        }
      }

      if (['name', 'description', 'title', 'razao_social', 'nome_fantasia', 'nome', 'descricao'].includes(key)) {
        query = query.ilike(key, `%${value}%`);
      } else {
        query = query.eq(key, value);
      }
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === 'object') {
      // Defense-in-depth: validateFilters() should have caught this earlier and returned 400.
      // If we reach here (e.g. internal call site bypassed validation), refuse loudly instead of silently dropping.
      throw new InvalidFilterError(
        key,
        'filter value must be a primitive (string, number, boolean) — received a raw object. Use suffix promotion (e.g. `${key}_gte`) or a PostgREST string operator (e.g. "gte.10", "is.null").',
        'object',
      );
    } else {
      query = query.eq(key, value);
    }
  });
  return query;
}

function computeSafeLimit(
  requestedLimit: number,
  table: string,
  hasSearch: boolean,
  offset: number,
  selectFields?: string,
): number {
  const isHeavy = HEAVY_TABLES.includes(table);
  const isVeryHeavy = VERY_HEAVY_TABLES.includes(table);
  if (!isHeavy) return requestedLimit;

  // Lightweight selects (few scalar fields, no JSONB) can handle larger pages safely
  const isLightweight = selectFields && selectFields !== '*' && selectFields.split(',').length <= 20;
  if (isLightweight) {
    if (hasSearch) return Math.min(requestedLimit, 250);
    return Math.min(requestedLimit, 500);
  }

  if (hasSearch) return Math.min(requestedLimit, 120);
  if (isVeryHeavy) return Math.min(requestedLimit, 100);
  if (offset >= 1000) return Math.min(requestedLimit, 125);
  return Math.min(requestedLimit, 200);
}

function isUnpopulatedMaterializedViewError(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('has not been populated')
    || (normalized.includes('materialized view') && normalized.includes('not been populated'))
    || normalized.includes('mv precisa de refresh');
}

// ============================================
// VIRTUAL TABLE: product_print_areas
// Materializes personalization_areas JSONB → flat rows
// ============================================

function normalizeTechniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeArea(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function getAreas(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeArea);
}

function getAreaId(area: Record<string, unknown>, index: number): string {
  const rawId = area.id;
  return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : `area-${index}`;
}

function buildVirtualRecords(productId: string, personalizationAreas: unknown): Record<string, unknown>[] {
  const areas = getAreas(personalizationAreas);
  return areas.flatMap((area, index) => {
    const areaId = getAreaId(area, index);
    const techniqueIds = normalizeTechniqueIds(area.allowed_technique_ids ?? area.technique_ids);
    return techniqueIds.map((techniqueId) => ({
      ...area,
      id: `${productId}::${areaId}::${techniqueId}`,
      product_id: productId,
      area_id: areaId,
      area_name: typeof area.area_name === 'string' ? area.area_name : typeof area.name === 'string' ? area.name : `Área ${index + 1}`,
      technique_id: techniqueId,
      allowed_technique_ids: techniqueIds,
      is_active: area.is_active !== false,
      display_order: typeof area.display_order === 'number' ? area.display_order : index,
      component_name: typeof area.component_name === 'string' ? area.component_name : null,
      location_name: typeof area.location_name === 'string' ? area.location_name : null,
      _virtual: true,
    }));
  });
}

function parseVirtualId(virtualId: string) {
  const parts = virtualId.split('::');
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  return { productId: parts[0], areaId: parts[1], techniqueId: parts[2] };
}

async function fetchProductForVirtualAreas(externalSupabase: any, productId: string) {
  const { data: product, error } = await externalSupabase
    .from('products')
    .select('id, personalization_areas')
    .eq('id', productId)
    .maybeSingle();
  const missingColumn = !!error?.message?.includes("personalization_areas");
  return { product, error, missingColumn };
}

function addTechniqueToAreas(personalizationAreas: unknown, techniqueId: string, areaName = 'Área Principal') {
  const areas = getAreas(personalizationAreas);
  if (areas.length === 0) {
    const areaId = crypto.randomUUID();
    return {
      updatedAreas: [{ id: areaId, area_name: areaName, allowed_technique_ids: [techniqueId], is_active: true, is_primary: true, display_order: 0, unit: 'cm', shape: 'rectangle', max_width: 0, max_height: 0 }],
      areaId, alreadyLinked: false,
    };
  }
  const targetIndex = areas.findIndex((a) => a.is_primary === true);
  const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
  const targetArea = normalizeArea(areas[resolvedIndex]);
  const areaId = getAreaId(targetArea, resolvedIndex);
  const existing = normalizeTechniqueIds(targetArea.allowed_technique_ids ?? targetArea.technique_ids);
  const alreadyLinked = existing.includes(techniqueId);
  const next = alreadyLinked ? existing : [...existing, techniqueId];
  targetArea.id = areaId;
  targetArea.allowed_technique_ids = next;
  if ('technique_ids' in targetArea) targetArea.technique_ids = next;
  if (typeof targetArea.area_name !== 'string' && typeof targetArea.name !== 'string') targetArea.area_name = areaName;
  areas[resolvedIndex] = targetArea;
  return { updatedAreas: areas, areaId, alreadyLinked };
}

function removeTechniqueFromAreas(personalizationAreas: unknown, areaId: string, techniqueId: string) {
  const areas = getAreas(personalizationAreas);
  let removed = false;
  const updatedAreas = areas.map((area, index) => {
    const next = normalizeArea(area);
    const nextAreaId = getAreaId(next, index);
    if (nextAreaId !== areaId) return next;
    const current = normalizeTechniqueIds(next.allowed_technique_ids ?? next.technique_ids);
    const filtered = current.filter((id) => id !== techniqueId);
    removed = removed || filtered.length !== current.length;
    next.id = nextAreaId;
    next.allowed_technique_ids = filtered;
    if ('technique_ids' in next) next.technique_ids = filtered;
    return next;
  });
  return { updatedAreas, removed };
}

// ============================================
// MAIN HANDLER
// ============================================

const TopLevelBodySchema = z.object({
  operation: z.enum(['select', 'insert', 'update', 'delete', 'upsert', 'batch_insert', 'rpc', 'batch', 'ping']),
  table: z.string().min(1).optional(),
  queries: z.array(z.record(z.unknown())).max(10).optional(),
  rpcName: z.string().optional(),
  rpcParams: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  data: z.unknown().optional(),
  id: z.unknown().optional(),
  select: z.string().optional(),
  orderBy: z.object({ column: z.string(), ascending: z.boolean().optional() }).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
  countMode: z.string().optional(),
  onConflict: z.string().optional(),
}).refine(data => {
  if (data.operation === 'batch') return true;
  if (data.operation === 'ping') return true;
  if (data.operation === 'rpc') return !!data.rpcName;
  return !!data.table;
}, { message: "Field 'table' is required for CRUD operations, 'rpcName' for RPC" });

Deno.serve((req) => {
  const corsHeaders = getCorsHeaders(req);
  // Guard raiz: nada lançado a partir daqui pode escapar ao runtime,
  // ou o edge-runtime devolve 503 SUPABASE_EDGE_RUNTIME_ERROR genérico
  // (sem CORS, sem JSON) que trava a UI ("blank screen").
  let requestId = "unknown";
  try {
    requestId = getOrCreateRequestId(req);
  } catch {
    // ignora — vamos usar "unknown"
  }
  return requestCtx.run({ requestId }, async () => {
    let corsHeaders: Record<string, string> = buildPublicCorsHeaders({ allowMethods: "POST, OPTIONS" });
    try {
      corsHeaders = getCorsHeaders(req);
      const preflightResponse = handleCorsPreflightIfNeeded(req);
      if (preflightResponse) return preflightResponse;
    } catch (e) {
      console.error(`[external-db-bridge] CORS init failed: ${(e as Error).message}`);
    }

    const requestStartTime = performance.now();
    console.log(`[external-db-bridge] [req_id=${requestId}] request_start method=${req.method}`);

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const parsed = TopLevelBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400, corsHeaders);
    }

    const body = parsed.data as Record<string, unknown>;

    // ============================================
    // PING (keep-alive — sem DB I/O, sem auth, sem breaker)
    // Ping é diagnóstico/warm-up — deve responder mesmo com circuito aberto.
    // ============================================
    if (body.operation === 'ping') {
      return jsonResponse({ ok: true, ts: Date.now(), warm: true }, 200, corsHeaders);
    }

    // Circuit breaker só barra operações reais (após parse do body).
    if (!breaker.canRequest()) {
      return circuitOpenResponse("external-db", corsHeaders);
    }

    // ============================================
    // BATCH OPERATION
    // ============================================
    if (body.operation === 'batch') {
      return await handleBatch(body, req, corsHeaders, requestStartTime);
    }

    const operation = body.operation as Operation;

    // ============================================
    // RPC OPERATION
    // ============================================
    if (operation === 'rpc') {
      return await handleRpc(body, corsHeaders);
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================
    const response = await handleCrud(body, req, corsHeaders, requestStartTime);
    if (response.status >= 500) breaker.recordFailure(); else breaker.recordSuccess();
    return response;

  } catch (error) {
    if (error instanceof InvalidFilterError) {
      const totalDuration = Math.round(performance.now() - requestStartTime);
      console.warn(`⚠️ [external-db-bridge] InvalidFilterError after ${totalDuration}ms — field="${error.field}" type=${error.receivedType}`);
      return jsonResponse({
        error: 'Invalid filter values',
        details: [{ field: error.field, reason: error.reason, receivedType: error.receivedType }],
        hint: 'Each filter value must be a primitive. Use suffix promotion (e.g. price_gte) or PostgREST string operators ("gte.10", "is.null", "in.(a,b)").',
      }, 400, corsHeaders);
    }
    breaker.recordFailure();
    const totalDuration = Math.round(performance.now() - requestStartTime);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [telemetry] [req_id=${requestId}] Request failed after ${totalDuration}ms: ${errorMessage}`);
    // Devolve 200 + flag fallback para o cliente acionar retry/degradação
    // sem que o supabase-js trate como exceção fatal e a UI quebre.
    return jsonResponse({
      error: 'SERVICE_FAILED',
      message: errorMessage,
      fallback: true,
      request_id: requestId,
    }, 200, corsHeaders);
  }
  });
});

// ============================================
// BATCH HANDLER
// ============================================

async function handleBatch(body: any, req: Request, corsHeaders: Record<string, string>, requestStartTime: number) {
  const queries = body.queries as Array<Record<string, unknown>>;
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400, corsHeaders);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: 'Batch limited to 10 queries max' }, 400, corsHeaders);
  }

  const externalSupabaseOrResp = await getExternalClient(corsHeaders);
  if (externalSupabaseOrResp instanceof Response) return externalSupabaseOrResp;
  // Narrow estável dentro de closures async (TS perde narrow em vars que mudam globalmente).
  const externalSupabase: ServiceClient = externalSupabaseOrResp;

  const results = await Promise.all(
    queries.map(async (q, idx) => {
      const qTable = q.table as string;
      const qSelect = (q.select as string) || '*';
      const qFilters = q.filters as Record<string, unknown> | undefined;
      const qOrderBy = q.orderBy as { column: string; ascending?: boolean } | undefined;
      const hasSearch = !!(qFilters && '_search' in qFilters);
      const rawLimit = (q.limit as number) || 500;
      const qOffset = (q.offset as number) || 0;
      const qLimit = computeSafeLimit(rawLimit, qTable, hasSearch, qOffset, qSelect);
      const qCacheKey = q.cacheKey as string | undefined;
      const qCountMode = q.countMode as string | undefined;

      if (qCacheKey) {
        const cached = getCached<{ records: unknown[]; count: number | null }>(qCacheKey);
        if (cached) {
          console.log(`[batch] Query ${idx} (${qTable}) served from cache (${(cached.records as unknown[]).length} records)`);
          return { success: true, data: cached, fromCache: true };
        }
      }

      const resourceGroup = getResourceGroup(qTable);
      if (!resourceGroup) return { success: false, error: `Tabela '${qTable}' não mapeada` };

      // Reject malformed filters (objects, NaN, functions) per-batch-item BEFORE building the query.
      const batchFilterViolations = validateFilters(qFilters);
      if (batchFilterViolations.length > 0) {
        console.warn(`[batch] Query ${idx} (${qTable}) rejected — invalid filters:`, batchFilterViolations);
        return {
          success: false,
          error: 'Invalid filter values',
          details: batchFilterViolations,
          hint: 'Each filter value must be a primitive. Use suffix promotion (e.g. price_gte) or PostgREST string operators ("gte.10", "is.null", "in.(a,b)").',
        };
      }

      try {
        const queryStart = performance.now();
        // Use centralized resolver (same hard guard: limit > 50 AND no id) for batch too
        const batchResolved = resolveProductsSelect({
          table: qTable,
          select: qSelect,
          limit: rawLimit,
          hasId: false,
        });
        const effectiveBatchSelect = batchResolved.effectiveSelect;
        logSelectDecision({
          callSite: 'handleBatch',
          table: qTable,
          callerSelect: qSelect,
          effectiveLimit: rawLimit ?? qLimit,
          hasId: false,
          resolved: batchResolved,
        });
        const selectOpts = qCountMode ? { count: qCountMode as 'exact' | 'planned' | 'estimated' } : undefined;
        let query = selectOpts
          ? externalSupabase.from(qTable).select(effectiveBatchSelect, selectOpts)
          : externalSupabase.from(qTable).select(effectiveBatchSelect);
        if (qFilters) query = applyFilters(query, qFilters, null);
        if (qOrderBy) query = query.order(qOrderBy.column, { ascending: qOrderBy.ascending ?? false });
        query = query.range(qOffset, qOffset + qLimit - 1);

        // Execute with backoff+jitter ONLY for connection/transport flakes.
        // Statement timeouts skip retry here and go to the degradation fallback below.
        const execStart = performance.now();
        const { data: selectData, error: selectError, count } = await (async () => {
          try {
            const r = await retrySupabaseCall<unknown>(
              async () => {
                const { data, error, count } = await query;
                return { data: { data, count }, error: error as { message: string; code?: string } | null };
              },
              { maxAttempts: 3, baseMs: 60, capMs: 600, budgetMs: 1500, isTransient: isBridgeTransient, label: `batch:${qTable}` },
            );
            const payload = (r.data ?? { data: null, count: null }) as { data: unknown; count: number | null };
            if (r.attempts > 1) console.log(`[batch] ✅ ${qTable} recovered after ${r.attempts} attempts in ${r.totalMs}ms`);
            return { data: payload.data as any, error: null, count: payload.count };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { data: null, error: { message: msg } as { message: string; code?: string }, count: null };
          }
        })();
        const duration = Math.round(performance.now() - execStart);
        if (selectError) {
          if (qTable.startsWith('mv_') && isUnpopulatedMaterializedViewError(selectError.message)) {
            console.warn(`[batch] Query ${idx} (${qTable}) returned unpopulated MV; sending empty result`);
            const result = {
              records: [],
              count: 0,
              meta: { materialized_view_status: 'not_populated' },
            };
            if (qCacheKey) setCache(qCacheKey, result);
            return { success: true, data: result };
          }

          // Retry on statement timeout with reduced limit and no count
          if (selectError.message?.includes('statement timeout') && qLimit > 50) {
            const retryLimit = Math.min(qLimit, 50);
            console.warn(`[batch] Query ${idx} (${qTable}) timed out with limit=${qLimit}, retrying with limit=${retryLimit} and no count`);
            const retryStart = performance.now();
            let retryQuery = externalSupabase.from(qTable).select(effectiveBatchSelect);
            if (qFilters) retryQuery = applyFilters(retryQuery, qFilters, null);
            if (qOrderBy) retryQuery = retryQuery.order(qOrderBy.column, { ascending: qOrderBy.ascending ?? false });
            retryQuery = retryQuery.range(qOffset, qOffset + retryLimit - 1);

            const { data: retryData, error: retryError } = await retryQuery;
            const retryDuration = Math.round(performance.now() - retryStart);

            if (retryError) {
              console.warn(`[batch] Query ${idx} (${qTable}) retry also failed in ${retryDuration}ms: ${retryError.message}`);
              return { success: false, error: retryError.message };
            }

            const retryResult = { records: retryData || [], count: null };
            if (qCacheKey) setCache(qCacheKey, retryResult);
            console.log(`[batch] ♻️ Query ${idx} (${qTable}) retry OK in ${retryDuration}ms, ${retryData?.length ?? 0} records`);
            return { success: true, data: retryResult };
          }

          console.warn(`[batch] Query ${idx} (${qTable}) failed in ${duration}ms: ${selectError.message}`);
          return { success: false, error: selectError.message };
        }

        const result = { records: selectData || [], count };
        if (qCacheKey) setCache(qCacheKey, result);

        const icon = duration >= VERY_SLOW_QUERY_THRESHOLD_MS ? '🔴' : duration >= SLOW_QUERY_THRESHOLD_MS ? '🟡' : '✅';
        console.log(`[batch] ${icon} Query ${idx} (${qTable}) ${duration}ms, ${selectData?.length ?? 0} records`);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  const totalDuration = Math.round(performance.now() - requestStartTime);
  console.log(`[batch] Total: ${totalDuration}ms for ${queries.length} queries`);
  return jsonResponse({ success: true, results }, 200, corsHeaders);
}

// ============================================
// RPC HANDLER
// ============================================

async function handleRpc(body: any, corsHeaders: Record<string, string>) {
  const rpcName = body.rpcName as string;
  const rpcParams = body.rpcParams as Record<string, unknown>;

  if (!ALLOWED_RPCS.includes(rpcName as any)) {
    return jsonResponse({ error: `RPC '${rpcName}' não permitida`, allowedRpcs: ALLOWED_RPCS }, 403, corsHeaders);
  }

  const externalSupabase = await getExternalClient(corsHeaders);
  if (externalSupabase instanceof Response) return externalSupabase;

  console.log(`RPC: ${rpcName}`, rpcParams);
  const rpcStart = performance.now();
  const { data: rpcDataRaw, error: rpcError } = await externalSupabase.rpc(rpcName, rpcParams || {});
  const rpcDuration = Math.round(performance.now() - rpcStart);
  const rpcData = rpcDataRaw as Record<string, unknown> | unknown[] | null;

  if (rpcError) {
    emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: 'error', error: rpcError.message });
    return jsonResponse({ error: rpcError.message }, 400, corsHeaders);
  }

  emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: classifyDuration(rpcDuration), recordCount: Array.isArray(rpcData) ? rpcData.length : 1 });

  // Enrich legacy flat responses from fn_get_customization_price
  let enrichedData: unknown = rpcData;
  const flat = (rpcData && !Array.isArray(rpcData)) ? rpcData as Record<string, unknown> : null;
  const isLegacyFlat = !!(flat && flat.success && flat.tabela_codigo && !flat.tabela);
  if (rpcName === 'fn_get_customization_price' && isLegacyFlat && flat) {
    enrichedData = await enrichCustomizationPrice(externalSupabase, flat);
  }

  return jsonResponse({ success: true, data: enrichedData }, 200, corsHeaders);
}

async function enrichCustomizationPrice(externalSupabase: any, rpcData: any) {
  try {
    const { data: tabelaRows } = await externalSupabase
      .from('tabela_preco_gravacao_oficial')
      .select('id,area_maxima_texto,max_cores,cobra_por_cor')
      .eq('codigo', rpcData.tabela_codigo)
      .eq('ativo', true)
      .limit(1);

    if (tabelaRows?.length) {
      const t = tabelaRows[0];
      const { data: faixaRows } = await externalSupabase
        .from('tabela_preco_gravacao_oficial_faixa')
        .select('largura_max,altura_max')
        .eq('tabela_preco_gravacao_id', t.id);

      let maxLargura: number | null = null;
      let maxAltura: number | null = null;
      if (faixaRows?.length) {
        const larguras = faixaRows.map((f: any) => f.largura_max).filter((v: any): v is number => typeof v === 'number' && v < 90);
        const alturas = faixaRows.map((f: any) => f.altura_max).filter((v: any): v is number => typeof v === 'number' && v < 90);
        maxLargura = larguras.length ? Math.max(...larguras) : null;
        maxAltura = alturas.length ? Math.max(...alturas) : null;
      }

      return {
        ...rpcData,
        tabela: { ...(rpcData.tabela || {}), id: t.id, area_maxima_texto: t.area_maxima_texto ?? null, largura_max_cm: maxLargura, altura_max_cm: maxAltura, max_cores: t.max_cores ?? rpcData.max_cores ?? null, cobra_por_cor: t.cobra_por_cor ?? false },
      };
    }
  } catch (e) {
    console.warn('[external-db-bridge] RPC enrichment failed:', e);
  }
  return rpcData;
}

// ============================================
// CRUD HANDLER
// ============================================

async function handleCrud(body: any, req: Request, corsHeaders: Record<string, string>, requestStartTime: number) {
  const operation = body.operation as Operation;
  let table = body.table as string;

  if (!table || typeof table !== 'string' || table === 'undefined') {
    return jsonResponse({ error: `Parâmetro 'table' é obrigatório e deve ser uma string válida (recebido: ${JSON.stringify(table)})` }, 400, corsHeaders);
  }

  // Resolve aliases
  const alias = resolveTableAlias(table, body.filters, body.orderBy, body.select);
  table = alias.table;
  const filters = alias.filters;
  const orderBy = alias.orderBy;
  const select = alias.select;
  const aliasType = alias.aliasType;

  // Auth check
  const isReadOperation = operation === 'select';
  const isPublicTable = PRODUCT_TABLES.includes(table as ProductTable) || PRODUCT_VIEWS.includes(table as ProductView);
  const isSensitive = SENSITIVE_TABLES.has(table);
  const allowPublicAccess = isReadOperation && isPublicTable && !isSensitive;

  const authHeader = req.headers.get('Authorization');
  let userId: string | null = null;
  let userRole = 'public';

  // ⚡ FAST-PATH: skip auth entirely for anonymous reads on public catalog tables.
  // Saves ~150–300ms per request (no getUser RTT, no user_roles lookup).
  // Write operations and sensitive tables ALWAYS go through full auth below.
  const isWriteOp = ['insert', 'update', 'delete', 'upsert', 'batch_insert'].includes(operation);
  const skipAuth = allowPublicAccess && !isWriteOp && (!authHeader || !authHeader.startsWith('Bearer '));

  if (!skipAuth && authHeader?.startsWith('Bearer ')) {
    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    // getClaims is faster than getUser — verifies JWT locally without server RTT.
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await localSupabase.auth.getClaims(token);

    if (claimsData?.claims?.sub && !claimsError) {
      userId = claimsData.claims.sub;
      const localService = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: userRoles, error: roleError } = await localService.from('user_roles').select('role').eq('user_id', userId);
      if (roleError) console.error('Error fetching user roles:', roleError);
      userRole = userRoles?.[0]?.role || 'vendedor';
    } else if (!allowPublicAccess) {
      console.error('Auth failed:', claimsError?.message);
    }
  }

  if (!allowPublicAccess && !userId) {
    console.error(`Authentication required: table=${table}, operation=${operation}, sensitive=${isSensitive}`);
    return jsonResponse({ error: 'Autenticação necessária' }, 401, corsHeaders);
  }

  console.log(`Operation: ${operation} on table: ${table} (public: ${allowPublicAccess})`);

  // Extract remaining body fields
  const { data, id, limit: queryLimit, offset: queryOffset, countMode: requestCountMode } = body;

  // Validate resource group & permissions
  const resourceGroup = getResourceGroup(table);
  if (!resourceGroup) {
    if (SYSTEM_TABLES.includes(table as any)) {
      return jsonResponse({ error: `Tabela '${table}' não está disponível para acesso externo` }, 403, corsHeaders);
    }
    return jsonResponse({ error: `Tabela '${table}' não mapeada`, availableTables: { products: PRODUCT_TABLES, companies: COMPANY_TABLES } }, 400, corsHeaders);
  }

  if (!PERMISSIONS[resourceGroup].includes(operation)) {
    return jsonResponse({ error: `Operação '${operation}' não permitida para '${resourceGroup}'`, allowed: PERMISSIONS[resourceGroup] }, 403, corsHeaders);
  }

  if (['insert', 'update', 'delete', 'upsert', 'batch_insert'].includes(operation)) {
    if (!['admin', 'gerente', 'vendedor'].includes(userRole)) {
      return jsonResponse({ error: 'Permissão insuficiente para esta operação' }, 403, corsHeaders);
    }
    if (userRole === 'vendedor' && operation === 'delete') {
      return jsonResponse({ error: 'Vendedores não podem excluir registros' }, 403, corsHeaders);
    }
  }

  // Determina elegibilidade de cache cedo (antes de tocar BD).
  // Cache é seguro para qualquer usuário em tabelas públicas não-sensíveis:
  // a resposta não depende da identidade (sem RLS no BD externo).
  // Excluímos apenas count='exact' (precisa ser preciso) e tabelas sensíveis.
  const isExactCount = requestCountMode === 'exact';
  const isCacheable =
    operation === 'select' &&
    allowPublicAccess &&
    !isExactCount;

  // CACHE LOOKUP: serve direto da memória se houver hit válido
  let cacheKey: string | null = null;
  if (isCacheable) {
    cacheKey = buildCacheKey(table, body);
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) {
      cacheHitsTotal++;
      const totalDuration = Math.round(performance.now() - requestStartTime);
      console.info(`⚡ [cache] HIT ${operation}:${table} ${totalDuration}ms key=${cacheKey} (hits=${cacheHitsTotal} misses=${cacheMissesTotal})`);
      // Persist cache hit so the admin dashboard can compute Cache Hit Rate.
      emitTelemetry({
        operation,
        table,
        durationMs: totalDuration,
        status: 'ok',
        cacheHit: true,
        userId,
      });
      return cachedJsonResponse(cached, corsHeaders, true);
    }
    cacheMissesTotal++;
  }

  const externalSupabase = await getExternalClient(corsHeaders);
  if (externalSupabase instanceof Response) return externalSupabase;

  const isVirtual = table === 'product_print_areas';
  let result;

  switch (operation) {
    case 'select':
      result = await handleSelect(externalSupabase, table, { filters, id, select, orderBy, queryLimit, queryOffset, requestCountMode, isVirtual, aliasType, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'insert':
      result = await handleInsert(externalSupabase, table, { data, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'upsert':
      result = await handleUpsert(externalSupabase, table, { data, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'batch_insert':
      result = await handleBatchInsert(externalSupabase, table, { data, corsHeaders, onConflict: body.onConflict });
      if (result instanceof Response) return result;
      break;

    case 'update':
      result = await handleUpdate(externalSupabase, table, { data, id, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'delete':
      result = await handleDelete(externalSupabase, table, { id, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    default:
      return jsonResponse({ error: `Operação não suportada: ${operation}` }, 400, corsHeaders);
  }

  // Invalidação: qualquer write expira TODAS as entradas de cache da tabela tocada
  if (['insert', 'update', 'delete', 'upsert', 'batch_insert'].includes(operation)) {
    invalidateCacheForTable(table);
  }

  const totalDuration = Math.round(performance.now() - requestStartTime);
  if (totalDuration >= VERY_SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`🔴 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (VERY SLOW)`);
  } else if (totalDuration >= SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`🟡 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (SLOW)`);
  }

  // CACHE WRITE: armazena resposta para próximas requisições
  if (isCacheable && cacheKey) {
    const payload = JSON.stringify({ data: result, success: true });
    setCachedResponse(cacheKey, payload);
    return cachedJsonResponse(payload, corsHeaders, false);
  }

  return jsonResponse({ data: result, success: true }, 200, corsHeaders);
}

// ============================================
// SELECT
// ============================================

async function handleSelect(externalSupabase: any, table: string, opts: any) {
  const { filters, id, select, orderBy, queryLimit, queryOffset, requestCountMode, isVirtual, aliasType, corsHeaders } = opts;

  // Reject malformed filters (objects, NaN, functions) BEFORE building the query.
  const filterViolations = validateFilters(filters as Record<string, unknown> | undefined);
  if (filterViolations.length > 0) {
    console.warn(`[external-db-bridge] Rejecting select on "${table}" — ${filterViolations.length} invalid filter(s):`, filterViolations);
    return jsonResponse({
      error: 'Invalid filter values',
      details: filterViolations,
      hint: 'Each filter value must be a primitive. For range/null/in queries use suffix promotion (e.g. price_gte) or PostgREST string operators (e.g. "gte.10", "is.null", "in.(a,b)").',
    }, 400, corsHeaders);
  }

  if (isVirtual) {
    const selectStart = performance.now();
    const productIdFromId = typeof id === 'string' ? parseVirtualId(id)?.productId : null;
    const virtualProductId = productIdFromId ?? (typeof filters?.product_id === 'string' ? filters.product_id : null);
    if (!virtualProductId) {
      emitTelemetry({ operation: 'select', table, durationMs: Math.round(performance.now() - selectStart), status: 'error', error: 'Filtro product_id é obrigatório' });
      return jsonResponse({ error: 'Filtro product_id é obrigatório para product_print_areas' }, 400, corsHeaders);
    }

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, virtualProductId);
    const dur = Math.round(performance.now() - selectStart);

    if (missingColumn) {
      emitTelemetry({ operation: 'select', table, durationMs: dur, status: 'ok', recordCount: 0 });
      console.warn(`Virtual table ${table} unavailable: products.personalization_areas does not exist`);
      return { records: [], count: 0 };
    }
    if (productError) {
      emitTelemetry({ operation: 'select', table, durationMs: dur, status: 'error', error: productError.message });
      return jsonResponse({ error: productError.message }, 400, corsHeaders);
    }

    const limit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 200;
    const offset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
    let allRecords = buildVirtualRecords(virtualProductId, product?.personalization_areas);

    if (id) allRecords = allRecords.filter((r) => r.id === id);
    if (filters) {
      allRecords = allRecords.filter((r) => Object.entries(filters).every(([k, v]) => {
        if (v === undefined || v === null || v === '' || k === 'product_id') return true;
        return Array.isArray(v) ? v.includes(r[k] as never) : r[k] === v;
      }));
    }

    const paginated = allRecords.slice(offset, offset + limit);
    emitTelemetry({ operation: 'select', table, limit, offset, countMode: 'virtual', durationMs: dur, status: classifyDuration(dur), recordCount: paginated.length });
    return { records: paginated, count: allRecords.length };
  }

  // #7: In-memory TTL cache.
  //   - STATIC_TABLES: 10min TTL (categories, suppliers, etc.) — quase imutáveis.
  //   - PRODUCTS lightweight (lista pública): 60s TTL — só quando o caller
  //     usa o select lightweight padrão SEM filtros dinâmicos pesados.
  //     Reduz custo de re-paginação quando usuário troca de filtro/aba rápido.
  const STATIC_TABLES = new Set([
    'categories', 'suppliers', 'tags', 'colors', 'materials',
    'print_techniques', 'print_areas', 'price_tables',
  ]);

  // Detecta listing lightweight de products (sem id, sem search/keyset).
  // Filtros simples (booleanos / IDs) podem entrar no cache; _search e _keyset não.
  const hasDynamicFilter =
    filters && (
      Object.prototype.hasOwnProperty.call(filters, '_search') ||
      Object.prototype.hasOwnProperty.call(filters, '_keyset')
    );
  const isProductsListingCacheable =
    table === 'products' &&
    !id &&
    !hasDynamicFilter &&
    requestCountMode !== 'exact' &&
    requestCountMode !== 'planned';

  const isCacheable =
    (STATIC_TABLES.has(table) || isProductsListingCacheable) &&
    !id &&
    requestCountMode !== 'exact' &&
    requestCountMode !== 'planned';
  const cacheKey = isCacheable
    ? `select:${table}:${JSON.stringify({ filters: filters ?? null, select: select ?? '*', orderBy: orderBy ?? null, queryLimit: queryLimit ?? null, queryOffset: queryOffset ?? 0 })}`
    : null;
  if (cacheKey) {
    const cached = getCached<{ records: unknown[]; count: number | null }>(cacheKey);
    if (cached) {
      emitTelemetry({ operation: 'select', table, limit: queryLimit, offset: queryOffset ?? 0, countMode: 'cache', durationMs: 0, status: 'ok', recordCount: cached.records.length });
      return cached;
    }
  }

  // Category descendants optimization
  let categoryDescendants: string[] | null = null;
  if (table === 'products' && filters && (filters.category_id || filters.main_category_id)) {
    const catId = (filters.category_id || filters.main_category_id) as string;
    try {
      const { data: desc, error: descErr } = await externalSupabase.rpc('get_category_descendants', { category_uuid: catId });
      if (!descErr && Array.isArray(desc)) {
        categoryDescendants = desc as string[];
        console.log(`Category ${catId} has ${categoryDescendants.length} descendants`);
      }
    } catch (err) {
      console.warn('Error calling get_category_descendants:', err);
    }
  }

  const isHeavy = HEAVY_TABLES.includes(table);
  const isVeryHeavy = VERY_HEAVY_TABLES.includes(table);
  const hasSearch = filters && '_search' in filters;
  const hasNamePrefix = filters && '_name_prefix' in filters;
  const countMode = requestCountMode ?? (hasSearch ? 'none' : (isVeryHeavy ? 'none' : (isHeavy ? 'planned' : 'exact')));
  const queryCountMode = countMode === 'none' ? undefined : countMode;

  // ============================================
  // PRODUCTS LIGHTWEIGHT SELECT — delegated to resolveProductsSelect()
  // (single source of truth, hard guard: limit > 50 AND no id)
  // ============================================
  const requestedLimitRaw = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 500;
  // hasId considera tanto `id` top-level quanto `filters.id` (fetch direto via filters):
  // ambos resultam em consulta single-row e devem preservar o payload completo
  // para detail/edit pages — não devem ser degradados pelo lightweight forçado.
  const filtersId = filters && typeof filters === 'object' ? (filters as Record<string, unknown>).id : undefined;
  const hasIdSignal = !!id || (filtersId !== undefined && filtersId !== null && filtersId !== '');
  const resolved = resolveProductsSelect({
    table,
    select,
    limit: requestedLimitRaw,
    hasId: hasIdSignal,
  });
  const effectiveSelect = resolved.effectiveSelect;
  logSelectDecision({
    callSite: 'handleSelect',
    table,
    callerSelect: select,
    effectiveLimit: requestedLimitRaw,
    hasId: hasIdSignal,
    resolved,
  });

  let query = queryCountMode
    ? externalSupabase.from(table).select(effectiveSelect, { count: queryCountMode })
    : externalSupabase.from(table).select(effectiveSelect);

  if (filters) query = applyFilters(query, filters, categoryDescendants);
  if (id) query = query.eq('id', id);
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });

  const requestedLimit = requestedLimitRaw;
  const safeOffset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
  const safeLimit = computeSafeLimit(requestedLimit, table, !!(hasSearch || hasNamePrefix), safeOffset, effectiveSelect);
  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  const selectStart = performance.now();
  let selectData: unknown[] | null;
  let selectError: { message: string; code?: string } | null;
  let count: number | null;

  try {
    // Backoff+jitter for connection/transport flakes only. Statement timeouts
    // skip retry here and fall through to the dedicated degradation fallback.
    const r = await retrySupabaseCall<unknown>(
      async () => {
        const res = await query;
        return {
          data: { data: res.data, count: res.count },
          error: res.error as { message: string; code?: string } | null,
        };
      },
      { maxAttempts: 3, baseMs: 80, capMs: 800, budgetMs: 2000, isTransient: isBridgeTransient, label: `select:${table}` },
    );
    const payload = (r.data ?? { data: null, count: null }) as { data: unknown[] | null; count: number | null };
    selectData = payload.data;
    selectError = null;
    count = payload.count;
    if (r.attempts > 1) console.log(`[select] ✅ ${table} recovered after ${r.attempts} attempts in ${r.totalMs}ms`);
  } catch (abortErr) {
    const msg = abortErr instanceof Error ? abortErr.message : String(abortErr);
    // If transient retries exhausted but it's actually a Supabase-shaped error,
    // surface it as selectError so downstream fallbacks (statement timeout,
    // orderBy column missing) can still kick in.
    if (isBridgeTransient(abortErr)) {
      const selectDuration = Math.round(performance.now() - selectStart);
      emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'error', error: `transient retries exhausted: ${msg}` });
      return jsonResponse({ error: 'Backend instável — tente novamente em instantes' }, 503, corsHeaders);
    }
    selectData = null;
    selectError = { message: msg } as { message: string; code?: string };
    count = null;
  }

  const selectDuration = Math.round(performance.now() - selectStart);

  if (selectError) {
    if (table.startsWith('mv_') && isUnpopulatedMaterializedViewError(selectError.message)) {
      emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'ok', recordCount: 0 });
      console.warn(`[external-db-bridge] ${table} not populated yet; returning empty result`);
      return {
        records: [],
        count: 0,
        meta: { materialized_view_status: 'not_populated' },
      };
    }

    // On statement timeout for products, retry with even smaller limit and no count
    if (selectError.message?.includes('statement timeout') && safeLimit > 50) {
      console.warn(`[retry] ${table} timed out with limit=${safeLimit}, retrying with limit=50 and no count`);
      const retryStart = performance.now();
      let retryQuery = externalSupabase.from(table).select(effectiveSelect);
      if (filters) retryQuery = applyFilters(retryQuery, filters, categoryDescendants);
      if (id) retryQuery = retryQuery.eq('id', id);
      if (orderBy) retryQuery = retryQuery.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      retryQuery = retryQuery.range(safeOffset, safeOffset + 49);

      const { data: retryData, error: retryError } = await retryQuery;
      const retryDuration = Math.round(performance.now() - retryStart);

      if (retryError) {
        emitTelemetry({ operation: 'select', table, limit: 50, offset: safeOffset, countMode: 'none', durationMs: retryDuration, status: 'error', error: retryError.message });
        return jsonResponse({ error: retryError.message }, 400, corsHeaders);
      }

      let records = retryData || [];
      if (aliasType === 'technique') records = records.map(mapTechniqueRowToLegacyShape);
      if (aliasType === 'priceTable') records = records.map(mapPriceTableRowToLegacyShape);
      emitTelemetry({ operation: 'select', table, limit: 50, offset: safeOffset, countMode: 'none', durationMs: retryDuration, status: classifyDuration(retryDuration), recordCount: records.length });
      console.log(`[retry] Selected ${records.length} records from ${table} (offset=${safeOffset}, limit=50)`);
      return { records, count: null };
    }

    // Fallback: orderBy column missing or invalid (e.g. price_updated_at not yet provisioned)
    // Symptoms: PostgREST 42703 "column ... does not exist", or generic order-related failure.
    const errMsg = selectError.message || '';
    const errCode = (selectError as { code?: string }).code || '';
    const orderColumn = orderBy?.column;
    const looksLikeOrderFailure = !!orderColumn && (
      errCode === '42703' ||
      errMsg.includes(`column "${orderColumn}"`) ||
      errMsg.includes(`"${orderColumn}" does not exist`) ||
      (errMsg.toLowerCase().includes('order') && errMsg.includes(orderColumn))
    );

    if (orderBy && looksLikeOrderFailure) {
      console.warn(
        `[external-db-bridge] orderBy fallback: column "${orderColumn}" failed on table "${table}" ` +
        `(code=${errCode || 'n/a'}, msg="${errMsg}"). Retrying without orderBy. ` +
        `Caller origin: select="${effectiveSelect.slice(0, 80)}..." filters=${JSON.stringify(filters ?? {}).slice(0, 200)}`
      );

      const retryStart = performance.now();
      let retryQuery = queryCountMode
        ? externalSupabase.from(table).select(effectiveSelect, { count: queryCountMode })
        : externalSupabase.from(table).select(effectiveSelect);
      if (filters) retryQuery = applyFilters(retryQuery, filters, categoryDescendants);
      if (id) retryQuery = retryQuery.eq('id', id);
      // Intentionally skip .order() — that's the whole point of the fallback.
      retryQuery = retryQuery.range(safeOffset, safeOffset + safeLimit - 1);

      const { data: retryData, error: retryError, count: retryCount } = await retryQuery;
      const retryDuration = Math.round(performance.now() - retryStart);

      if (retryError) {
        emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: retryDuration, status: 'error', error: `orderBy-fallback failed: ${retryError.message}` });
        return jsonResponse({ error: retryError.message }, 400, corsHeaders);
      }

      let records = retryData || [];
      if (aliasType === 'technique') records = records.map(mapTechniqueRowToLegacyShape);
      if (aliasType === 'priceTable') records = records.map(mapPriceTableRowToLegacyShape);

      emitTelemetry({
        operation: 'select',
        table,
        limit: safeLimit,
        offset: safeOffset,
        countMode,
        durationMs: retryDuration,
        status: classifyDuration(retryDuration),
        recordCount: records.length,
        error: `orderBy-fallback applied (column=${orderColumn})`,
      });
      console.log(`[orderBy-fallback] Selected ${records.length} records from ${table} without orderBy (was: ${orderColumn})`);

      const result = { records, count: retryCount ?? null, meta: { orderBy_fallback: orderColumn } };
      // Listings dinâmicos (products) usam TTL curto (60s); estáticos usam default (10min).
      if (cacheKey) setCache(cacheKey, result, table === 'products' ? 60_000 : undefined);
      return result;
    }

    emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'error', error: selectError.message });
    return jsonResponse({ error: selectError.message }, 400, corsHeaders);
  }

  let records: unknown[] = (selectData ?? []) as unknown[];

  // Apply legacy row transforms for aliased tables
  const rowsAsRecords = () => records as Record<string, unknown>[];
  if (aliasType === 'technique') records = rowsAsRecords().map(mapTechniqueRowToLegacyShape);
  if (aliasType === 'priceTable') records = rowsAsRecords().map(mapPriceTableRowToLegacyShape);

  emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: classifyDuration(selectDuration), recordCount: records.length });
  console.log(`Selected ${records.length} records from ${table} (offset=${safeOffset}, limit=${safeLimit}, count=${count ?? 'n/a'})`);

  const result = { records, count: count ?? null };
  // Listings de products: TTL curto (60s) para refletir mudanças no catálogo;
  // tabelas estáticas (categories, suppliers, etc.): TTL default (10min).
  if (cacheKey) setCache(cacheKey, result, table === 'products' ? 60_000 : undefined);
  return result;
}

// ============================================
// INSERT
// ============================================

async function handleInsert(externalSupabase: any, table: string, opts: any) {
  const { data, isVirtual, corsHeaders } = opts;

  if (isVirtual) {
    if (!data?.product_id || !data?.technique_id) {
      return jsonResponse({ error: 'product_id e technique_id obrigatórios para inserção em product_print_areas' }, 400, corsHeaders);
    }
    const productId = data.product_id as string;
    const techniqueId = data.technique_id as string;
    const areaName = (data.area_name as string) || 'Área Principal';

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, productId);
    if (missingColumn) return jsonResponse({ error: 'Áreas de personalização não disponíveis neste catálogo externo' }, 503, corsHeaders);
    if (productError) return jsonResponse({ error: productError.message }, 400, corsHeaders);
    if (!product) return jsonResponse({ error: `Produto '${productId}' não encontrado` }, 404, corsHeaders);

    const { updatedAreas, areaId, alreadyLinked } = addTechniqueToAreas(product.personalization_areas, techniqueId, areaName);

    if (!alreadyLinked) {
      const { data: updatedProduct, error: updateError } = await externalSupabase
        .from('products')
        .update({ personalization_areas: updatedAreas, updated_at: new Date().toISOString() })
        .eq('id', productId).select('id').maybeSingle();

      if (updateError) return jsonResponse({ error: updateError.message, details: updateError.details }, 400, corsHeaders);
      if (!updatedProduct) return jsonResponse({ error: `Produto '${productId}' não encontrado para atualização` }, 404, corsHeaders);
    }

    const virtualRecord = buildVirtualRecords(productId, updatedAreas)
      .find((r) => r.area_id === areaId && r.technique_id === techniqueId);
    const result = virtualRecord || { id: `${productId}::${areaId}::${techniqueId}`, product_id: productId, area_id: areaId, technique_id: techniqueId };
    console.log(`${alreadyLinked ? 'Already linked' : 'Inserted virtual record'} in ${table}:`, (result as any).id);
    return result;
  }

  // Standard insert
  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const insertData: Record<string, unknown> = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });
  if (canInjectCreatedAt && !insertData.created_at) insertData.created_at = new Date().toISOString();

  console.log(`Inserting into ${table}:`, JSON.stringify(insertData).substring(0, 500));
  const { data: insertResult, error: insertError } = await externalSupabase.from(table).insert(insertData).select().single();

  if (insertError) {
    console.error('Insert error:', insertError.message, insertError.details, insertError.hint);
    return jsonResponse({ error: insertError.message, details: insertError.details, hint: insertError.hint }, 400, corsHeaders);
  }

  console.log(`Inserted record in ${table}:`, insertResult?.id);
  return insertResult;
}

// ============================================
// UPDATE
// ============================================

async function handleUpdate(externalSupabase: any, table: string, opts: any) {
  const { data, id, isVirtual, corsHeaders } = opts;

  if (isVirtual) {
    return jsonResponse({ error: 'Atualização direta de product_print_areas não suportada; atualize products.personalization_areas' }, 400, corsHeaders);
  }
  if (!id) return jsonResponse({ error: 'ID obrigatório para atualização' }, 400, corsHeaders);
  if (!data) return jsonResponse({ error: 'Dados obrigatórios para atualização' }, 400, corsHeaders);

  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const updateData = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });

  console.log(`Updating ${table} id=${id}:`, JSON.stringify(updateData).substring(0, 500));
  const { data: updateResult, error: updateError } = await externalSupabase.from(table).update(updateData).eq('id', id).select().maybeSingle();

  if (updateError) {
    console.error('Update error:', updateError.message, updateError.details, updateError.hint);
    return jsonResponse({ error: updateError.message, details: updateError.details, hint: updateError.hint }, 400, corsHeaders);
  }
  if (!updateResult) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

  console.log(`Updated record in ${table}:`, id);
  return updateResult;
}

// ============================================
// DELETE
// ============================================

async function handleDelete(externalSupabase: any, table: string, opts: any) {
  const { id, isVirtual, corsHeaders } = opts;

  if (!id) return jsonResponse({ error: 'ID obrigatório para exclusão' }, 400, corsHeaders);

  if (isVirtual) {
    const parsedId = parseVirtualId(id);
    if (!parsedId) return jsonResponse({ error: `ID virtual inválido: '${id}'` }, 400, corsHeaders);

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, parsedId.productId);
    if (missingColumn) return jsonResponse({ error: 'Áreas de personalização não disponíveis neste catálogo externo' }, 503, corsHeaders);
    if (productError) return jsonResponse({ error: productError.message }, 400, corsHeaders);
    if (!product) return jsonResponse({ error: `Produto '${parsedId.productId}' não encontrado` }, 404, corsHeaders);

    const { updatedAreas, removed } = removeTechniqueFromAreas(product.personalization_areas, parsedId.areaId, parsedId.techniqueId);
    if (!removed) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

    const { data: updatedProduct, error: updateError } = await externalSupabase
      .from('products')
      .update({ personalization_areas: updatedAreas, updated_at: new Date().toISOString() })
      .eq('id', parsedId.productId).select('id').maybeSingle();

    if (updateError) return jsonResponse({ error: updateError.message, details: updateError.details }, 400, corsHeaders);
    if (!updatedProduct) return jsonResponse({ error: `Produto '${parsedId.productId}' não encontrado para atualização` }, 404, corsHeaders);

    console.log(`Deleted virtual record from ${table}:`, id);
    return { success: true, deleted_id: id };
  }

  // Standard delete
  const { data: deleteResult, error: deleteError } = await externalSupabase.from(table).delete().eq('id', id).select('id').maybeSingle();

  if (deleteError) {
    console.error('Delete error:', deleteError.message, deleteError.details, deleteError.hint);
    return jsonResponse({ error: deleteError.message, details: deleteError.details, hint: deleteError.hint }, 400, corsHeaders);
  }
  if (!deleteResult) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

  console.log(`Deleted record from ${table}:`, id);
  return { success: true, deleted_id: id };
}

// ============================================
// UPSERT (single row, merge on SKU)
// ============================================

async function handleUpsert(externalSupabase: any, table: string, opts: any) {
  const { data, corsHeaders } = opts;
  if (!data) return jsonResponse({ error: 'Dados obrigatórios para upsert' }, 400, corsHeaders);

  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const upsertData: Record<string, unknown> = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });
  if (canInjectCreatedAt && !upsertData.created_at) upsertData.created_at = new Date().toISOString();

  // Default merge on 'sku' for products, 'id' for others
  const onConflict = table === 'products' ? 'sku' : 'id';

  console.log(`Upserting into ${table} (onConflict=${onConflict}):`, JSON.stringify(upsertData).substring(0, 500));
  const { data: result, error } = await externalSupabase
    .from(table)
    .upsert(upsertData, { onConflict })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Upsert error:', error.message, error.details, error.hint);
    return jsonResponse({ error: error.message, details: error.details, hint: error.hint }, 400, corsHeaders);
  }

  console.log(`Upserted record in ${table}:`, result?.id);
  return result;
}

// ============================================
// BATCH INSERT (multiple rows in one call)
// ============================================

async function handleBatchInsert(externalSupabase: any, table: string, opts: any) {
  const { data, corsHeaders, onConflict } = opts;

  if (!Array.isArray(data) || data.length === 0) {
    return jsonResponse({ error: 'batch_insert requer "data" como array não-vazio' }, 400, corsHeaders);
  }
  if (data.length > 100) {
    return jsonResponse({ error: 'batch_insert limitado a 100 registros por chamada' }, 400, corsHeaders);
  }

  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const now = new Date().toISOString();

  const sanitizedRows = data.map((row: Record<string, unknown>) => {
    const sanitized = sanitizeExternalWriteData(table, {
      ...row,
      ...(canInjectUpdatedAt ? { updated_at: now } : {}),
    });
    if (canInjectCreatedAt && !sanitized.created_at) sanitized.created_at = now;
    return sanitized;
  });

  const useUpsert = !!onConflict;
  const conflictColumn = typeof onConflict === 'string' ? onConflict : (table === 'products' ? 'sku' : 'id');

  console.log(`Batch ${useUpsert ? 'upsert' : 'insert'} into ${table}: ${sanitizedRows.length} rows${useUpsert ? ` (onConflict=${conflictColumn})` : ''}`);

  let result, error;

  if (useUpsert) {
    const response = await externalSupabase
      .from(table)
      .upsert(sanitizedRows, { onConflict: conflictColumn, ignoreDuplicates: false })
      .select('id,sku,name');
    result = response.data;
    error = response.error;
  } else {
    const response = await externalSupabase
      .from(table)
      .insert(sanitizedRows)
      .select('id,sku,name');
    result = response.data;
    error = response.error;
  }

  if (error) {
    console.error('Batch insert error:', error.message, error.details, error.hint);
    return jsonResponse({
      error: error.message,
      details: error.details,
      hint: error.hint,
    }, 400, corsHeaders);
  }

  console.log(`Batch ${useUpsert ? 'upserted' : 'inserted'} ${result?.length ?? 0} records in ${table}`);
  return { records: result || [], count: result?.length ?? 0 };
}

// ============================================
// UTILITIES
// ============================================

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  const reqId = currentRequestId();
  let finalBody: unknown = body;
  if (reqId && body && typeof body === "object" && !Array.isArray(body)) {
    finalBody = { ...(body as Record<string, unknown>), request_id: reqId };
  }
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (reqId) headers[REQUEST_ID_HEADER] = reqId;
  return new Response(JSON.stringify(finalBody), { status, headers });
}

// FNV-1a 32-bit — barato e suficiente para chave de cache (não-criptográfico).
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * In-memory cache para reads públicos do catálogo.
 * Vive dentro da instância da edge function (mesma vida do worker).
 * Como mantemos a função quente via cron keep-alive a cada 4 min, o cache
 * sobrevive entre requests reais.
 *
 * - TTL: 60s (catálogo muda raramente)
 * - Tamanho máx: 200 entradas (evita memory bloat)
 * - Eviction: LRU simples via Map (delete+set restaura ordem de inserção)
 */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 200;
type CacheEntry = { payload: string; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();

let cacheHitsTotal = 0;
let cacheMissesTotal = 0;

function buildCacheKey(table: string, body: any): string {
  const raw = JSON.stringify({
    o: body.operation,
    s: body.select ?? null,
    f: body.filters ?? null,
    ob: body.orderBy ?? null,
    l: body.limit ?? null,
    of: body.offset ?? null,
    cm: body.countMode ?? null,
    id: body.id ?? null,
  });
  // Prefixa com a tabela em texto puro para permitir invalidação seletiva.
  return `t:${table}|${fnv1aHash(raw)}`;
}

function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  // LRU touch: move para o final reordenando inserção
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.payload;
}

function setCachedResponse(key: string, payload: string): void {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    // Evict o mais antigo (primeiro no Map)
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Invalida todas as entradas de cache que referenciam a tabela tocada.
 * Como a key embute a tabela, fazemos full scan barato (max 200 entradas).
 */
function invalidateCacheForTable(table: string): void {
  const tagPrefix = `t:${table}|`;
  let removed = 0;
  for (const [key, entry] of responseCache.entries()) {
    // entry.payload contém o resultado, mas precisamos identificar pela tabela.
    // Reescrevemos buildCacheKey para anexar tag legível antes do hash.
    if (key.startsWith(tagPrefix)) {
      responseCache.delete(key);
      removed++;
    }
  }
  if (removed > 0) console.info(`🧹 [cache] invalidated ${removed} entries for table=${table}`);
}

function cachedJsonResponse(payload: string, corsHeaders: Record<string, string>, hit: boolean): Response {
  return new Response(payload, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Bridge-Cache': hit ? 'HIT' : 'MISS',
    },
  });
}

// ============================================
// EXTERNAL CLIENT — singleton por isolate
// ============================================
// Reusa o mesmo client entre requests do mesmo isolate. O fetch keep-alive
// interno do supabase-js mantém o socket aberto, eliminando TLS+auth handshake
// repetido em rajadas paralelas (catálogo, dashboards, batches).
// Em rajada de 6+ requests, isso reduz "tempo até a 1ª query" de ~800ms para ~50ms.
let cachedExternalClient: ServiceClient | null = null;
let warmupPromise: Promise<void> | null = null;

function buildExternalClient(url: string, key: string): ServiceClient {
  return castSupabaseClient(createClient(url, key, {
    db: { schema: 'public' },
    global: {
      headers: {
        'x-connection-timeout': '15000',
        // Increase PostgREST statement timeout to 25s to avoid premature cancellation
        'Prefer': 'max-affected=1000',
      },
    },
  }));
}

async function getExternalClient(corsHeaders: Record<string, string>) {
  if (cachedExternalClient) return cachedExternalClient;

  // SSOT: DB-first via integration_credentials, fallback to legacy env aliases
  // (EXTERNAL_SUPABASE_URL/EXTERNAL_SUPABASE_SERVICE_ROLE_KEY/EXTERNAL_SUPABASE_SERVICE_KEY).
  const [{ value: externalUrl }, { value: externalKey }] = await Promise.all([
    resolveCredential("EXTERNAL_PROMOBRIND_URL"),
    resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY"),
  ]);
  if (!externalUrl || !externalKey) {
    console.warn('[external-db-bridge] EXTERNAL_PROMOBRIND_URL/KEY not configured (DB or env) — returning empty payload');
    return jsonResponse(
      { records: [], data: [], count: 0, _unconfigured: true, _message: 'Banco externo não configurado' },
      200,
      corsHeaders,
    );
  }
  cachedExternalClient = buildExternalClient(externalUrl, externalKey);
  return cachedExternalClient;
}

/**
 * Warm-up no boot do isolate — abre TLS + handshake PostgREST em paralelo
 * ao Deno.serve. Não bloqueia o handler; idempotente.
 */
function warmupExternalClient(): Promise<void> {
  if (warmupPromise) return warmupPromise;
  warmupPromise = (async () => {
    try {
      const [{ value: url }, { value: key }] = await Promise.all([
        resolveCredential("EXTERNAL_PROMOBRIND_URL"),
        resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY"),
      ]);
      if (!url || !key) return;
      const client: ServiceClient = cachedExternalClient ?? (cachedExternalClient = buildExternalClient(url, key));
      const t0 = performance.now();
      const { error } = await client.from('suppliers').select('id').limit(1);
      const ms = Math.round(performance.now() - t0);
      if (error) {
        console.warn(`[boot-warmup] ⚠️ ${error.message} (${ms}ms)`);
      } else {
        console.log(`[boot-warmup] ✅ external client ready (${ms}ms)`);
      }
    } catch (e) {
      console.warn(`[boot-warmup] ⚠️ ${e instanceof Error ? e.message : String(e)}`);
    }
  })();
  return warmupPromise;
}

// Dispara warm-up no boot do isolate (não-bloqueante).
warmupExternalClient();

// Default lightweight columns for products table to avoid fetching heavy JSONB columns
const PRODUCTS_LIGHTWEIGHT_SELECT = 'id,name,sku,sale_price,cost_price,primary_image_url,category_id,main_category_id,supplier_id,supplier_reference,description,short_description,brand,is_active,active,stock_quantity,min_quantity,created_at,updated_at,is_featured,is_bestseller,is_new,is_on_sale,is_kit';

// ============================================
// PRODUCTS SELECT RESOLVER — single source of truth for the lightweight rule
// ============================================
// Centralizes the decision to swap the caller's `select` for `PRODUCTS_LIGHTWEIGHT_SELECT`.
// HARD GUARD: lightweight is ONLY applied when limit > LIGHTWEIGHT_LIMIT_THRESHOLD AND no `id` is set.
// This prevents regressions where detail/edit pages (id present, or limit ≤ 50) lose JSONB columns.
//
// Decision matrix (table === 'products'):
//   id present                              → keep caller's select (detail/edit)
//   limit ≤ 50                              → keep caller's select (small reads)
//   limit > 50 AND select is '*' or empty   → force lightweight  (Rule A)
//   limit > 50 AND select is very wide (>25 cols) → force lightweight  (Rule B)
//   limit > 50 AND select touches heavy JSONB     → force lightweight  (Rule C)
//   otherwise                               → keep caller's select
export const LIGHTWEIGHT_LIMIT_THRESHOLD = 50;

// Threshold (em número de colunas no select do caller) acima do qual forçamos
// lightweight como Rule B ("wide-select-listing"). Configurável via env
// LIGHTWEIGHT_COLUMN_THRESHOLD para permitir tuning sem redeploy de código —
// fallback para 25, valor empírico que cobre o PRODUCTS_LIGHTWEIGHT_SELECT (24 cols)
// com folga de 1 coluna para selects ligeiramente customizados.
function readColumnThresholdFromEnv(): number {
  try {
    // deno-lint-ignore no-explicit-any
    const denoGlobal = (globalThis as any).Deno;
    const raw = denoGlobal?.env?.get?.('LIGHTWEIGHT_COLUMN_THRESHOLD');
    if (!raw) return 25;
    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 25;
    return parsed;
  } catch {
    return 25;
  }
}
export const WIDE_SELECT_COLUMN_THRESHOLD = readColumnThresholdFromEnv();

// Colunas confirmadas como JSONB pesados / arrays grandes / texto longo na tabela `products`.
// Fonte: inspeção empírica do payload SELECT * (148 cols → ver lightweightSelect.e2e.test.ts)
// e PRODUCTS_LIGHTWEIGHT_SELECT (subset das 24 colunas leves).
//
// Manter como Set para lookup O(1) e tokenização precisa (sem falsos positivos via substring).
export const HEAVY_PRODUCT_COLUMNS = new Set<string>([
  // JSONB / objects
  'metadata',
  'specifications',
  'attributes_json',
  'attributes',
  'personalization_areas',
  'schema_json',
  'dimensions',
  'seo_issues',
  // HTML / texto longo
  'description_html',
  'description_packaging_info',
  'meta_description',
  'meta_keywords',
  'ai_description',
  'ai_summary',
  // Arrays / JSON arrays grandes
  'images',
  'videos',
  'tags',
  'key_benefits',
  'capacities',
  'combined_sizes',
  'use_cases',
  'target_audience',
  'colors',
  'materials',
]);

// Extrai o nome canônico de uma coluna PostgREST a partir de um token de select.
// Suporta:
//   "name"                    → "name"
//   "alias:column"            → "column"          (alias PostgREST)
//   "metadata->>summary"      → "metadata"        (operador JSON)
//   "metadata->path->>x"      → "metadata"
//   "alias:metadata->>x"      → "metadata"
//   "table(col1,col2)"        → ""                (embed — não é coluna direta)
//   "  spaced  "              → "spaced"
// Retorna '' quando o token não representa uma coluna direta da tabela base
// (embeds não devem disparar o detector de "heavy").
export function extractBaseColumn(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  // Embed PostgREST (joins): "fk_table(...)" — não é uma coluna direta da base.
  if (trimmed.includes('(')) return '';
  // Remove alias PostgREST "alias:column"
  const afterAlias = trimmed.includes(':') ? trimmed.slice(trimmed.indexOf(':') + 1) : trimmed;
  // Remove operadores JSON "->" e "->>"
  const beforeArrow = afterAlias.split('->')[0];
  return beforeArrow.trim();
}

// Detecta se o select do caller toca uma coluna pesada da tabela `products`.
// Usa tokenização com boundary (não regex bruto) para evitar falsos positivos
// como `meta_description` casando dentro de `meta_description_id`.
export function callerSelectIsHeavy(select: string): boolean {
  for (const rawToken of select.split(',')) {
    const col = extractBaseColumn(rawToken);
    if (col && HEAVY_PRODUCT_COLUMNS.has(col)) return true;
  }
  return false;
}

export interface ResolveProductsSelectInput {
  table: string;
  select: string | undefined | null;
  limit: number | undefined | null;
  hasId: boolean;
}

export interface ResolveProductsSelectResult {
  effectiveSelect: string;
  forcedLightweight: boolean;
  reason:
    | 'not-products'
    | 'has-id'
    | 'small-limit'
    | 'star-select-listing'
    | 'wide-select-listing'
    | 'heavy-jsonb-listing'
    | 'caller-select';
}

export function resolveProductsSelect(input: ResolveProductsSelectInput): ResolveProductsSelectResult {
  const { table, select, limit, hasId } = input;
  const callerSelect = select && select.length > 0 ? select : '*';

  if (table !== 'products') {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'not-products' };
  }
  if (hasId) {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'has-id' };
  }

  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 0;
  // HARD GUARD against regression: never force lightweight on small reads.
  if (safeLimit <= LIGHTWEIGHT_LIMIT_THRESHOLD) {
    return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'small-limit' };
  }

  const isStarOrEmpty = !select || select === '*';
  if (isStarOrEmpty) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'star-select-listing' };
  }
  if (select.split(',').length > WIDE_SELECT_COLUMN_THRESHOLD) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'wide-select-listing' };
  }
  if (callerSelectIsHeavy(select)) {
    return { effectiveSelect: PRODUCTS_LIGHTWEIGHT_SELECT, forcedLightweight: true, reason: 'heavy-jsonb-listing' };
  }

  return { effectiveSelect: callerSelect, forcedLightweight: false, reason: 'caller-select' };
}

// ============================================
// STRUCTURED SELECT-DECISION LOG
// ============================================
// Emite UM log estruturado por decisão de `select`, em ambos os call sites
// (handleSelect e handleBatch). Permite filtrar por `event=select-decision`
// no painel de logs e cruzar com telemetria — inclui sempre tabela, limit
// efetivo e motivo (default vs forçado).
export interface SelectDecisionLogContext {
  callSite: 'handleSelect' | 'handleBatch';
  table: string;
  callerSelect: string | undefined | null;
  effectiveLimit: number;
  hasId: boolean;
  resolved: ResolveProductsSelectResult;
}

const LIGHTWEIGHT_REASONS = new Set<ResolveProductsSelectResult['reason']>([
  'star-select-listing',
  'wide-select-listing',
  'heavy-jsonb-listing',
]);

export function logSelectDecision(ctx: SelectDecisionLogContext): void {
  const { callSite, table, callerSelect, effectiveLimit, hasId, resolved } = ctx;
  const callerLen = (callerSelect ?? '').split(',').filter(Boolean).length;
  const effectiveLen = resolved.effectiveSelect.split(',').filter(Boolean).length;

  const payload = {
    event: 'select-decision',
    callSite,
    table,
    forcedLightweight: resolved.forcedLightweight,
    mode: resolved.forcedLightweight ? 'lightweight-forced' : 'caller-default',
    reason: resolved.reason,
    effectiveLimit,
    hasId,
    limitThreshold: LIGHTWEIGHT_LIMIT_THRESHOLD,
    columnThreshold: WIDE_SELECT_COLUMN_THRESHOLD,
    // mantido para compat com dashboards já existentes
    threshold: LIGHTWEIGHT_LIMIT_THRESHOLD,
    callerSelect: callerSelect && callerSelect.length > 120
      ? `${callerSelect.slice(0, 117)}...`
      : (callerSelect ?? '(omitted)'),
    callerColumnCount: callerLen,
    effectiveColumnCount: effectiveLen,
    exceededColumnThreshold: callerLen > WIDE_SELECT_COLUMN_THRESHOLD,
  };

  if (resolved.forcedLightweight) {
    console.log(
      `[external-db-bridge] ⚡ select-decision table=${table} mode=lightweight-forced reason=${resolved.reason} ` +
      `limit=${effectiveLimit} (>${LIGHTWEIGHT_LIMIT_THRESHOLD}) caller_cols=${callerLen} ` +
      `(col_threshold=${WIDE_SELECT_COLUMN_THRESHOLD}) effective_cols=${effectiveLen} ` +
      `callSite=${callSite} → ${JSON.stringify(payload)}`,
    );
    return;
  }

  // Para não poluir os logs de queries triviais, só registramos o "default"
  // em situações onde a decisão é informativa: tabela `products` com qualquer limit,
  // ou outras tabelas quando o limit ultrapassa o threshold (poderia ter sido afetado).
  const isInformative =
    table === 'products' ||
    LIGHTWEIGHT_REASONS.has(resolved.reason) || // defesa: nunca cai aqui, mas explícito
    effectiveLimit > LIGHTWEIGHT_LIMIT_THRESHOLD;

  if (isInformative) {
    console.log(
      `[external-db-bridge] · select-decision table=${table} mode=caller-default reason=${resolved.reason} ` +
      `limit=${effectiveLimit} hasId=${hasId} caller_cols=${callerLen} ` +
      `(col_threshold=${WIDE_SELECT_COLUMN_THRESHOLD}) callSite=${callSite} → ${JSON.stringify(payload)}`,
    );
  }
}

```

---

## 📦 `supabase/functions/quote-sync/index.ts`

**Secrets/env vars referenciadas:**

- `N8N_QUOTE_WEBHOOK_URL`
- `QUOTE_SYNC_API_KEY`
- `SALESPRO_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**`deno.json`:**
```json
{
  "nodeModulesDir": "none"
}

```

**Código fonte completo:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/// <reference lib="deno.ns" />
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { parseBodyWithSchema } from "../_shared/zod-validate.ts";
import { resolveCredential } from "../_shared/credentials.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const n8nWebhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");

/**
 * Resolve credenciais do CRM externo (DB-first via integration_credentials,
 * env fallback via aliases CRM_SUPABASE_URL → EXTERNAL_CRM_URL).
 * Antes lia Deno.env.get() em escopo de módulo, ignorando rotações
 * salvas pela UI /admin/conexoes.
 */
async function getCrmCreds(): Promise<{ url: string | null; key: string | null }> {
  const [urlRes, svcRes, anonRes] = await Promise.all([
    resolveCredential("EXTERNAL_CRM_URL"),
    resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
    resolveCredential("EXTERNAL_CRM_ANON_KEY"),
  ]);
  return { url: urlRes.value, key: svcRes.value ?? anonRes.value };
}

// ===== Zod Schemas =====

const SyncQuoteSchema = z.object({
  action: z.literal('sync_quote'),
  data: z.object({
    quoteId: z.string().uuid('quoteId must be a valid UUID'),
  }),
});

const SyncAllPendingSchema = z.object({
  action: z.literal('sync_all_pending'),
  data: z.object({}).optional(),
});

const TestWebhookSchema = z.object({
  action: z.literal('test_webhook'),
  data: z.object({}).optional(),
});

const RequestSchema = z.discriminatedUnion('action', [
  SyncQuoteSchema,
  SyncAllPendingSchema,
  TestWebhookSchema,
]);

// ===== Types =====

interface QuoteData {
  id: string;
  quote_number: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  seller_id?: string;
  seller_name?: string;
  status: string;
  subtotal: number;            // apresentado (com markup)
  discount_percent: number;    // aparente (cliente vê)
  discount_amount: number;
  total: number;
  notes?: string;
  valid_until?: string;
  payment_terms?: string;
  delivery_time?: string;
  shipping_type?: string;
  shipping_cost?: number;
  items: QuoteItemData[];
  created_at: string;
  // 🔒 Auditoria interna — NUNCA exibir ao cliente final no CRM
  internal_real_subtotal?: number;
  internal_real_discount_percent?: number;
  internal_negotiation_markup_percent?: number;
}

interface QuoteItemData {
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  color_name?: string;
  personalizations: PersonalizationData[];
}

interface PersonalizationData {
  technique_name: string;
  colors_count: number;
  positions_count: number;
  total_cost: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate body with Zod
    const parsed = await parseBodyWithSchema(req, RequestSchema, getCorsHeaders(req));
    if ('error' in parsed) return parsed.error;

    const { action, data } = parsed.data;
    console.log(`Quote sync action: ${action}`, data);

    switch (action) {
      case "sync_quote": {
        const { quoteId } = data;
        const quoteData = await fetchQuoteFromCRM(quoteId);
        if (!quoteData) throw new Error("Quote not found in CRM");

        let n8nResponse: Record<string, unknown> = {};
        if (n8nWebhookUrl) {
          try { n8nResponse = await sendToN8N(quoteData); }
          catch (err) { console.error("N8N sync failed (non-blocking):", err); }
        }

        await sendToSalesPro(quoteData);
        await updateCRMSyncStatus(quoteId, n8nResponse);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Quote synced successfully",
            bitrix_deal_id: n8nResponse.bitrix_deal_id,
            bitrix_quote_id: n8nResponse.bitrix_quote_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "sync_all_pending": {
        const { url: crmUrl, key: crmKey } = await getCrmCreds();
        if (!crmUrl || !crmKey) throw new Error("CRM database not configured");
        const crm = createClient(crmUrl, crmKey);

        const { data: pendingQuotes, error: fetchError } = await crm
          .from("quotes")
          .select("id")
          .eq("synced_to_bitrix", false)
          .in("status", ["sent", "approved"]);

        if (fetchError) throw fetchError;

        const results = [];
        for (const quote of pendingQuotes || []) {
          try {
            const quoteData = await fetchQuoteFromCRM(quote.id);
            if (quoteData) {
              let response: Record<string, unknown> = {};
              if (n8nWebhookUrl) {
                try { response = await sendToN8N(quoteData); } catch { /* skip */ }
              }
              await sendToSalesPro(quoteData);
              await updateCRMSyncStatus(quote.id, response);
              results.push({ id: quote.id, success: true });
            }
          } catch (syncErr) {
            const errorMessage = syncErr instanceof Error ? syncErr.message : "Unknown error";
            console.error(`Error syncing quote ${quote.id}:`, syncErr);
            results.push({ id: quote.id, success: false, error: errorMessage });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "test_webhook": {
        const results: Record<string, unknown> = {};

        if (n8nWebhookUrl) {
          try {
            const response = await fetch(n8nWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
            });
            results.n8n = { success: response.ok, status: response.status };
          } catch (e) {
            results.n8n = { success: false, error: String(e) };
          }
        }

        const salesProUrl = Deno.env.get("SALESPRO_WEBHOOK_URL");
        const apiKey = Deno.env.get("QUOTE_SYNC_API_KEY");
        if (salesProUrl && apiKey) {
          try {
            const response = await fetch(salesProUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": apiKey },
              body: JSON.stringify({ test: true, timestamp: new Date().toISOString(), source: "gifts-store" }),
            });
            const body = await response.text();
            results.salespro = { success: response.ok, status: response.status, body };
          } catch (e) {
            results.salespro = { success: false, error: String(e) };
          }
        }

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quote sync error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ===== Fetch quote data from external CRM database =====
async function fetchQuoteFromCRM(quoteId: string): Promise<QuoteData | null> {
  const { url: crmUrl, key: crmKey } = await getCrmCreds();
  if (!crmUrl || !crmKey) {
    throw new Error("CRM database credentials not configured");
  }

  const crm = createClient(crmUrl, crmKey);

  const { data: quote, error: quoteError } = await crm
    .from("quotes").select("*").eq("id", quoteId).single();
  if (quoteError || !quote) { console.error("Error fetching quote:", quoteError); return null; }

  const { data: items, error: itemsError } = await crm
    .from("quote_items").select("*, quote_item_personalizations(*)")
    .eq("quote_id", quoteId).order("sort_order");
  if (itemsError) console.error("Error fetching items:", itemsError);

  let sellerName: string | undefined;
  if (quote.seller_id) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("user_id", quote.seller_id).single();
    sellerName = profile?.full_name;
  }

  const formattedItems: QuoteItemData[] = (items || []).map((item: Record<string, unknown>) => ({
    product_id: item.product_id as string,
    product_name: item.product_name as string,
    product_sku: item.product_sku as string | undefined,
    quantity: item.quantity as number,
    unit_price: Number(item.unit_price),
    subtotal: Number(item.subtotal),
    color_name: item.color_name as string | undefined,
    personalizations: ((item.quote_item_personalizations as Record<string, unknown>[]) || []).map((p) => ({
      technique_name: (p.technique_name as string) || "Unknown",
      colors_count: p.colors_count as number,
      positions_count: p.positions_count as number,
      total_cost: Number(p.total_cost),
    })),
  }));

  return {
    id: quote.id, quote_number: quote.quote_number,
    client_id: quote.client_id, client_name: quote.client_name,
    client_email: quote.client_email, client_phone: quote.client_phone,
    client_company: quote.client_company, seller_id: quote.seller_id,
    seller_name: sellerName, status: quote.status,
    subtotal: Number(quote.subtotal || 0), discount_percent: Number(quote.discount_percent || 0),
    discount_amount: Number(quote.discount_amount || 0), total: Number(quote.total || 0),
    notes: quote.notes, valid_until: quote.valid_until,
    payment_terms: quote.payment_terms, delivery_time: quote.delivery_time,
    shipping_type: quote.shipping_type, shipping_cost: Number(quote.shipping_cost || 0),
    items: formattedItems, created_at: quote.created_at,
    // Campos internos para auditoria (CRM uso interno apenas)
    internal_real_subtotal: quote.real_subtotal != null ? Number(quote.real_subtotal) : undefined,
    internal_real_discount_percent: quote.real_discount_percent != null ? Number(quote.real_discount_percent) : undefined,
    internal_negotiation_markup_percent: quote.negotiation_markup_percent != null ? Number(quote.negotiation_markup_percent) : undefined,
  };
}

async function updateCRMSyncStatus(quoteId: string, n8nResponse: Record<string, unknown>): Promise<void> {
  const { url: crmUrl, key: crmKey } = await getCrmCreds();
  if (!crmUrl || !crmKey) return;
  const crm = createClient(crmUrl, crmKey);
  const { error } = await crm.from("quotes").update({
    synced_to_bitrix: true, synced_at: new Date().toISOString(),
    bitrix_deal_id: (n8nResponse?.bitrix_deal_id as string) || null,
    bitrix_quote_id: (n8nResponse?.bitrix_quote_id as string) || null,
  }).eq("id", quoteId);
  if (error) console.error("Error updating CRM sync status:", error);
}

async function sendToN8N(quoteData: QuoteData): Promise<Record<string, unknown>> {
  if (!n8nWebhookUrl) throw new Error("N8N_QUOTE_WEBHOOK_URL not configured");
  const response = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_or_update_quote", quote: quoteData, timestamp: new Date().toISOString() }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`N8N webhook failed: ${response.status} - ${errorText}`);
  }
  try { return await response.json(); } catch { return { success: true }; }
}

async function sendToSalesPro(quoteData: QuoteData): Promise<void> {
  const webhookUrl = Deno.env.get("SALESPRO_WEBHOOK_URL");
  const apiKey = Deno.env.get("QUOTE_SYNC_API_KEY");
  if (!webhookUrl || !apiKey) { console.warn("SalesPro not configured, skipping"); return; }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ action: "create_or_update_quote", quote: quoteData, source: "gifts-store", timestamp: new Date().toISOString() }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SalesPro webhook error:", response.status, errorText);
    } else {
      console.log("SalesPro sync successful for quote:", quoteData.quote_number);
    }
  } catch (err) {
    console.error("SalesPro sync failed:", err);
  }
}

```

---

## 📦 `supabase/functions/sync-quote-bitrix/index.ts`

**Secrets/env vars referenciadas:**

- `N8N_QUOTE_WEBHOOK_URL`

**Código fonte completo:**

```typescript
import { getCorsHeaders } from '../_shared/cors.ts';
import { z } from '../_shared/zod-validate.ts';
import { fetchWithBreaker, CircuitOpenError, circuitOpenResponse } from '../_shared/external-fetch.ts';

// Mapping: seller email → Bitrix24 numeric seller_id
const SELLER_EMAIL_MAP: Record<string, number> = {
  "comercial01@promobrindes.com.br": 8,
  "henrique.silva@promobrindes.com.br": 10,
  "comercial03@promobrindes.com.br": 16,
  "comercial04@promobrindes.com.br": 5174,
  "comercial06@promobrindes.com.br": 5176,
  "comercial05@promobrindes.com.br": 5180,
  "comercial07@promobrindes.com.br": 16558,
};

const SyncQuoteBitrixSchema = z.object({
  quote: z.record(z.any()).optional(),
  proposalData: z.record(z.any()).optional(),
  pdfUrl: z.string().url().max(2000).optional(),
  filename: z.string().max(500).optional(),
  bitrixCompanyId: z.string().max(50).optional(),
  sellerEmail: z.string().email().max(255).optional(),
  shippingType: z.string().max(50).optional(),
  shippingCost: z.number().nonnegative().optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = SyncQuoteBitrixSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      quote,
      proposalData,
      pdfUrl,
      filename,
      bitrixCompanyId,
      sellerEmail,
      shippingType,
      shippingCost,
    } = parsed.data;

    // ── 1. Validate webhook URL ──────────────────────────────────────────────
    const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("N8N_QUOTE_WEBHOOK_URL não configurado nos secrets");
    }

    // ── 2. Resolve seller_id ─────────────────────────────────────────────────
    // Priority: email passed from frontend → undefined (n8n test mode uses default)
    const sellerId = sellerEmail ? SELLER_EMAIL_MAP[sellerEmail] : undefined;
    if (sellerEmail && sellerId === undefined) {
      console.warn(`sellerEmail "${sellerEmail}" não encontrado no SELLER_EMAIL_MAP — orçamento enviado sem seller_id`);
    }

    // ── 3. Resolve company_id (Bitrix numeric) — OBRIGATÓRIO (Spec v3.2) ────
    // bitrixCompanyId comes from companies.bitrix_id (string like "125240")
    const companyId = bitrixCompanyId ? parseInt(bitrixCompanyId, 10) : null;
    if (!companyId || !Number.isFinite(companyId) || companyId <= 0) {
      throw new Error("company_id (Bitrix) é obrigatório. Verifique se a empresa possui vínculo com o Bitrix24.");
    }

    // ── 4. REMOVIDO: bitrix_quote_id não é mais enviado no payload ───────────
    // Spec v3: o n8n busca pelo quote_id (código interno) no Bitrix e resolve sozinho
    // se deve criar ou atualizar. O gifts-store não precisa manter o ID do Bitrix.

    // ── 5. Build products array ──────────────────────────────────────────────
    // offer_id is null if not mapped — n8n handles this gracefully
    const rawItems = proposalData?.items || [];

    // ── Spec §3: excluir itens sem bitrix_product_id (ainda não importados no Bitrix24) ──
    const itemsValidos = rawItems.filter((item: any) => !!item.bitrix_product_id);
    const itemsExcluidos = rawItems.length - itemsValidos.length;
    if (itemsExcluidos > 0) {
      console.warn(`${itemsExcluidos} item(ns) excluído(s) do payload por não ter bitrix_product_id`);
    }
    if (itemsValidos.length === 0) {
      throw new Error("Nenhum produto da proposta possui ID no Bitrix24 (bitrix_product_id nulo em todos os itens). Aguarde a importação do catálogo.");
    }

    const products = itemsValidos.map((item: any) => {
      // Spec §6.2: offer_id = product_variants.bitrix_product_id (obrigatório)
      const offerId = Number(item.bitrix_product_id);
      if (!Number.isFinite(offerId) || offerId <= 0) {
        console.warn(`Item ignorado: bitrix_product_id inválido ("${item.bitrix_product_id}") — produto: ${item.name || item.product_name}`);
        return null;
      }

      // product_name = nome do produto + " - " + cor
      const baseName = item.name || item.product_name || "Produto";
      const colorSuffix = item.color ? ` - ${item.color}` : "";
      const productName = `${baseName}${colorSuffix}`;

      // SKU = supplier_sku da variante
      const sku = item.supplier_sku || item.composedCode || item.sku || item.product_sku || "";

      const qty = Number(item.quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) {
        console.warn(`Item ignorado: quantity inválida (${item.quantity}) — produto: ${baseName}`);
        return null;
      }

      // Spec v3.4: price = preço unitário SÓ DO PRODUTO (sem gravação, sem desconto)
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);

      const product: any = {
        offer_id: offerId,
        product_name: productName,
        sku,
        price: Math.round(unitPrice * 10000) / 10000,
        quantity: qty,
      };

      // Gravação (engraving) — valores do banco, sem recalcular
      // DB fields: unit_cost (preço unitário c/ markup), total_cost (MAX(valor_gravacao, setup)),
      //            setup_cost (custo de setup c/ markup)
      const allPers = item.personalizations || [];
      if (allPers.length > 0) {
        // Support multiple personalizations: aggregate all into one engraving block
        const engravings = allPers.map((pers: any) => {
          // total_cost from DB is the source of truth (includes markup + min billing)
          // unit_price = total_cost / qty rounded to 2 decimals — matches UI display
          const engravingTotal = Number(pers.total_cost ?? 0);
          const engravingUnit = qty > 0 ? Math.round((engravingTotal / qty) * 100) / 100 : 0;
          const setupPrice = Number(pers.setup_cost ?? 0);

          // size: try structured fields first, then parse from notes "Local — CODE | WxHcm"
          let sizeStr = "";
          if (pers.width_cm != null && pers.height_cm != null) {
            sizeStr = `${pers.width_cm}x${pers.height_cm}cm`;
          } else if (pers.area_cm2 != null) {
            sizeStr = `${pers.area_cm2}cm²`;
          } else if (pers.notes) {
            const dimMatch = String(pers.notes).match(/\|\s*([\d.,]+)\s*[x×]\s*([\d.,]+)\s*cm/i);
            if (dimMatch) {
              sizeStr = `${dimMatch[1]}x${dimMatch[2]}cm`;
            }
          }

          // engraving.type = "Technique | Location"
          let engravingType = pers.technique_name || "Personalização";
          if (pers.notes) {
            const notesRaw = String(pers.notes);
            const [locationPart] = notesRaw.split(" | ");
            if (locationPart) {
              const locationName = locationPart.split(" — ")[0]?.trim();
              if (locationName) {
                engravingType = `${engravingType} | ${locationName}`;
              }
            }
          }

          // Recalculate total from rounded unit to ensure subtotal parity with proposal
          const engravingTotalRounded = engravingUnit * qty;

          return {
            type: engravingType,
            unit_price: engravingUnit,
            total_price: Math.round(engravingTotalRounded * 100) / 100,
            setup_price: setupPrice,
            size: sizeStr,
          };
        });

        // Primary engraving (first one) — backward compatible
        product.engraving = engravings[0];

        // If multiple, attach full array
        if (engravings.length > 1) {
          product.engravings = engravings;
        }
      }

      return product;
    }).filter((p: any) => p !== null);

    if (products.length === 0) {
      throw new Error("Todos os itens foram rejeitados por dados inválidos (offer_id ou quantity). Verifique os dados dos produtos.");
    }

    // ── 6. Assemble final payload ────────────────────────────────────────────
    const rawClientName =
      proposalData?.client?.company ||
      proposalData?.client?.name ||
      quote?.client_company ||
      "Cliente";

    // Fix #4: Remove trailing " - XXXX" (bitrix_id suffix) to avoid duplication in title
    const clientName = rawClientName.replace(/\s*-\s*\d+\s*$/, "").trim();

    const payload: Record<string, unknown> = {
      title: `Orçamento - ${clientName} - ${companyId}`,
      company_id: companyId,
      products,
    };

    // Only include optional fields when resolved
    if (sellerId) payload.seller_id = sellerId;

    // Spec v3: quote_id = código interno do gifts-store (ex: "10001/26")
    const internalQuoteId = (quote?.quote_number || "").replace(/\s+/g, "");
    if (internalQuoteId) payload.quote_id = internalQuoteId;

    // Spec v3.4: discount_percentage — desconto global em % (ex: 5, 10, 15)
    const rawDiscount = Number(quote?.discount_percent ?? 0);
    if (Number.isFinite(rawDiscount) && rawDiscount > 0) {
      payload.discount_percentage = rawDiscount;
    }

    // Spec v3.4: freight — from direct shippingType/shippingCost fields (decoded by frontend)
    // Fallback: parse from internal_notes marker |||FRETE:tipo:custo|||
    let resolvedFreightType: string | null = null;
    let resolvedFreightValue: number | null = null;

    if (shippingType) {
      // Direct fields from frontend (preferred)
      const typeMap: Record<string, string> = { cif: "CIF", fob: "FOB", fob_pre: "FOB_PRE" };
      resolvedFreightType = typeMap[shippingType.toLowerCase()] || null;
      resolvedFreightValue = Number(shippingCost) || null;
    } else {
      // Fallback: parse from internal_notes marker
      const freightMatch = String(quote?.internal_notes || "").match(/\|\|\|FRETE:([^:]+):([^|]*)\|\|\|/);
      if (freightMatch) {
        const freightTypeMap: Record<string, string> = { CIF: "CIF", FOB: "FOB", FOB_PRE: "FOB_PRE" };
        resolvedFreightType = freightTypeMap[freightMatch[1].toUpperCase()] || null;
        resolvedFreightValue = parseFloat(freightMatch[2]) || null;
      }
    }

    if (resolvedFreightType) {
      const freight: Record<string, unknown> = { type: resolvedFreightType };
      if (resolvedFreightValue && Number.isFinite(resolvedFreightValue) && resolvedFreightValue > 0) {
        // If type is FOB but has a value, upgrade to FOB_PRE
        if (resolvedFreightType === "FOB") {
          freight.type = "FOB_PRE";
        }
        freight.value = resolvedFreightValue;
      }
      payload.freight = freight;
    }

    // Contact (numeric Bitrix contact_id if available)
    if (quote?.bitrix_contact_id) {
      const cId = parseInt(String(quote.bitrix_contact_id), 10);
      if (!isNaN(cId)) payload.contact_id = cId;
    }

    // Attach PDF URL
    if (pdfUrl && filename) {
      payload.pdf = { filename, url: pdfUrl };
    }

    // ── 7. Log (no sensitive content) ───────────────────────────────────────
    console.log("Sending to n8n:", JSON.stringify({
      ...payload,
      pdf: payload.pdf ? { filename: (payload.pdf as any).filename, url: (payload.pdf as any).url } : undefined,
      products_count: products.length,
      seller_email_input: sellerEmail,
      bitrix_company_id_input: bitrixCompanyId,
    }));

    // ── 8. Call n8n webhook ──────────────────────────────────────────────────
    const response = await fetchWithBreaker("bitrix", webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // n8n sometimes returns plain text on error
      const text = await response.text();
      result = { raw: text };
    }

    console.log("n8n response status:", response.status, "body:", JSON.stringify(result));

    if (!response.ok) {
      const errMsg = (result as any)?.error || (result as any)?.raw || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    if (error instanceof CircuitOpenError) {
      return circuitOpenResponse(error, corsHeaders);
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("sync-quote-bitrix error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## 📦 `supabase/functions/bitrix-sync/index.ts`

**Secrets/env vars referenciadas:**

- `BITRIX24_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Código fonte completo:**

```typescript
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authorize } from '../_shared/authorize.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";
import { fetchWithBreaker, CircuitOpenError, circuitOpenResponse } from "../_shared/external-fetch.ts";

const BitrixSyncSchema = z.object({
  action: z.enum([
    'get_companies', 'get_company', 'search_companies',
    'get_deals', 'get_deal_products', 'sync_full',
    'get_stored_clients', 'get_stored_deals',
    'create_deal', 'update_deal', 'get_sync_logs',
  ]),
  data: z.record(z.unknown()).optional(),
});

// Initialize Supabase client for database operations
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AuthZ: bitrix-sync escreve no CRM externo — supervisor (admin) ou dev.
    // Server-side double-check via has_role() para defesa em profundidade.
    const auth = await authorize(req, { requireRole: 'supervisor', enforceServerSide: true });
    if (!auth.ok) return auth.response;

    const bitrixWebhookUrl = Deno.env.get('BITRIX24_WEBHOOK_URL');

    if (!bitrixWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Bitrix24 webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = BitrixSyncSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, data } = parsed.data;
    // Helper para extrair número de `data?.<key>` (Zod tipa data como
    // Record<string, unknown> | undefined — sem narrow seguro inline).
    const numField = (key: string, fallback: number): number => {
      const v = data?.[key];
      return typeof v === "number" ? v : fallback;
    };
    const stringField = (key: string): string | undefined => {
      const v = data?.[key];
      return typeof v === "string" ? v : undefined;
    };

    let result;

    switch (action) {
      case 'get_companies': {
        // Fetch companies/clients from Bitrix24
        const response = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.company.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            select: [
              'ID',
              'TITLE',
              'LOGO',
              'UF_CRM_1590780873288', // Ramo de Atividade
              'UF_CRM_1631795570468', // Nicho/Segmento
              'UF_CRM_1755898066',    // Cor Predominante Logo
              'UF_CRM_1755898357',    // Cores Secundárias Logo
              'EMAIL',
              'PHONE',
              'ADDRESS',
            ],
            filter: data?.filter || {},
            start: data?.start || 0,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Bitrix24 API error:', errorText);
          throw new Error(`Bitrix24 API error: ${response.status}`);
        }

        const bitrixData = await response.json();
        console.log('Bitrix24 response:', JSON.stringify(bitrixData).slice(0, 500));

        // Transform Bitrix24 data to our client format
        const clients = (bitrixData.result || []).map((company: any) => ({
          id: company.ID,
          name: company.TITLE || 'Sem nome',
          ramo: company.UF_CRM_1590780873288 || 'Não informado',
          nicho: company.UF_CRM_1631795570468 || 'Não informado',
          primaryColor: parseColor(company.UF_CRM_1755898066),
          secondaryColors: parseColors(company.UF_CRM_1755898357),
          email: getFirstValue(company.EMAIL),
          phone: getFirstValue(company.PHONE),
          address: company.ADDRESS || '',
          logo: company.LOGO || null,
        }));

        result = {
          clients,
          total: bitrixData.total || clients.length,
          next: bitrixData.next,
        };
        break;
      }

      case 'get_company': {
        // Fetch single company by ID
        const companyId = data?.id;
        if (!companyId) {
          throw new Error('Company ID is required');
        }

        const response = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.company.get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: companyId }),
        });

        if (!response.ok) {
          throw new Error(`Bitrix24 API error: ${response.status}`);
        }

        const bitrixData = await response.json();
        const company = bitrixData.result;

        result = {
          id: company.ID,
          name: company.TITLE || 'Sem nome',
          ramo: company.UF_CRM_1590780873288 || 'Não informado',
          nicho: company.UF_CRM_1631795570468 || 'Não informado',
          primaryColor: parseColor(company.UF_CRM_1755898066),
          secondaryColors: parseColors(company.UF_CRM_1755898357),
          email: getFirstValue(company.EMAIL),
          phone: getFirstValue(company.PHONE),
          address: company.ADDRESS || '',
          logo: company.LOGO || null,
        };
        break;
      }

      case 'search_companies': {
        // Search companies by name
        const query = data?.query || '';
        
        const response = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.company.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            select: ['ID', 'TITLE', 'UF_CRM_1755898066'],
            filter: { '%TITLE': query },
            order: { TITLE: 'ASC' },
            start: 0,
          }),
        });

        if (!response.ok) {
          throw new Error(`Bitrix24 API error: ${response.status}`);
        }

        const bitrixData = await response.json();
        result = (bitrixData.result || []).map((c: any) => ({
          id: c.ID,
          name: c.TITLE,
          primaryColor: parseColor(c.UF_CRM_1755898066),
        }));
        break;
      }

      case 'get_deals': {
        // Fetch deals (purchase history) from Bitrix24
        const companyId = data?.companyId;
        
        const filter: Record<string, any> = {};
        if (companyId) {
          filter.COMPANY_ID = companyId;
        }
        if (data?.status) {
          filter.STAGE_ID = data.status;
        }

        const response = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.deal.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            select: [
              'ID',
              'TITLE',
              'COMPANY_ID',
              'OPPORTUNITY',
              'CURRENCY_ID',
              'STAGE_ID',
              'CLOSEDATE',
              'DATE_CREATE',
              'DATE_MODIFY',
              'ASSIGNED_BY_ID',
            ],
            filter,
            order: { DATE_CREATE: 'DESC' },
            start: data?.start || 0,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Bitrix24 deals error:', errorText);
          throw new Error(`Bitrix24 API error: ${response.status}`);
        }

        const bitrixData = await response.json();
        console.log('Bitrix24 deals response:', JSON.stringify(bitrixData).slice(0, 500));

        const deals = (bitrixData.result || []).map((deal: any) => ({
          id: deal.ID,
          title: deal.TITLE || 'Sem título',
          companyId: deal.COMPANY_ID,
          value: parseFloat(deal.OPPORTUNITY) || 0,
          currency: deal.CURRENCY_ID || 'BRL',
          stage: deal.STAGE_ID || 'NEW',
          closeDate: deal.CLOSEDATE,
          createdAt: deal.DATE_CREATE,
          updatedAt: deal.DATE_MODIFY,
          assignedTo: deal.ASSIGNED_BY_ID,
        }));

        result = {
          deals,
          total: bitrixData.total || deals.length,
          next: bitrixData.next,
        };
        break;
      }

      case 'get_deal_products': {
        // Fetch products in a deal
        const dealId = data?.dealId;
        if (!dealId) {
          throw new Error('Deal ID is required');
        }

        const response = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.deal.productrows.get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dealId }),
        });

        if (!response.ok) {
          throw new Error(`Bitrix24 API error: ${response.status}`);
        }

        const bitrixData = await response.json();
        
        result = (bitrixData.result || []).map((product: any) => ({
          id: product.ID,
          productId: product.PRODUCT_ID,
          productName: product.PRODUCT_NAME || 'Produto',
          quantity: parseInt(product.QUANTITY) || 1,
          price: parseFloat(product.PRICE) || 0,
          discount: parseFloat(product.DISCOUNT_SUM) || 0,
          total: parseFloat(product.SUM) || 0,
        }));
        break;
      }

      case 'sync_full': {
        // Full sync: get companies with their deals and save to database
        console.log('Starting full sync with database persistence...');
        
        const supabase = getSupabaseClient();
        const syncStartTime = new Date().toISOString();

        // Create sync log entry
        const { data: syncLog, error: logError } = await supabase
          .from('bitrix_sync_logs')
          .insert({ status: 'in_progress', started_at: syncStartTime })
          .select()
          .single();

        if (logError) {
          console.error('Error creating sync log:', logError);
        }

        try {
          // Get all companies
          const companiesResponse = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.company.list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              select: ['ID', 'TITLE', 'UF_CRM_1590780873288', 'UF_CRM_1631795570468', 'UF_CRM_1755898066', 'EMAIL', 'PHONE', 'ADDRESS'],
              start: data?.start || 0,
            }),
          });

          if (!companiesResponse.ok) {
            throw new Error(`Bitrix24 companies error: ${companiesResponse.status}`);
          }

          const companiesData = await companiesResponse.json();
          console.log(`Fetched ${companiesData.result?.length || 0} companies`);

          // Get all deals
          const dealsResponse = await fetchWithBreaker("bitrix", `${bitrixWebhookUrl}/crm.deal.list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              select: ['ID', 'TITLE', 'COMPANY_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'STAGE_ID', 'CLOSEDATE', 'DATE_CREATE'],
              order: { DATE_CREATE: 'DESC' },
              start: 0,
            }),
          });

          if (!dealsResponse.ok) {
            throw new Error(`Bitrix24 deals error: ${dealsResponse.status}`);
          }

          const dealsData = await dealsResponse.json();
          console.log(`Fetched ${dealsData.result?.length || 0} deals`);

          // Group deals by company for calculating totals
          const dealsByCompany: Record<string, any[]> = {};
          (dealsData.result || []).forEach((deal: any) => {
            const companyId = deal.COMPANY_ID;
            if (companyId) {
              if (!dealsByCompany[companyId]) {
                dealsByCompany[companyId] = [];
              }
              dealsByCompany[companyId].push({
                id: deal.ID,
                title: deal.TITLE,
                value: parseFloat(deal.OPPORTUNITY) || 0,
                currency: deal.CURRENCY_ID || 'BRL',
                stage: deal.STAGE_ID,
                closeDate: deal.CLOSEDATE,
                date: deal.DATE_CREATE,
              });
            }
          });

          // Upsert clients to database
          const clientsToUpsert = (companiesData.result || []).map((company: any) => {
            const companyDeals = dealsByCompany[company.ID] || [];
            const totalSpent = companyDeals.reduce((sum: number, d: any) => sum + d.value, 0);
            const parsedColor = parseColor(company.UF_CRM_1755898066);
            
            return {
              bitrix_id: company.ID,
              name: company.TITLE || 'Sem nome',
              ramo: company.UF_CRM_1590780873288 || null,
              nicho: company.UF_CRM_1631795570468 || null,
              primary_color_name: parsedColor.name,
              primary_color_hex: parsedColor.hex,
              email: getFirstValue(company.EMAIL) || null,
              phone: getFirstValue(company.PHONE) || null,
              address: company.ADDRESS || null,
              total_spent: totalSpent,
              last_purchase_date: companyDeals[0]?.date || null,
              synced_at: syncStartTime,
            };
          });

          if (clientsToUpsert.length > 0) {
            const { error: clientsError } = await supabase
              .from('bitrix_clients')
              .upsert(clientsToUpsert, { onConflict: 'bitrix_id' });

            if (clientsError) {
              console.error('Error upserting clients:', clientsError);
              throw new Error(`Database error: ${clientsError.message}`);
            }
            console.log(`Upserted ${clientsToUpsert.length} clients to database`);
          }

          // Upsert deals to database
          const dealsToUpsert = (dealsData.result || []).map((deal: any) => ({
            bitrix_id: deal.ID,
            bitrix_client_id: deal.COMPANY_ID || '',
            title: deal.TITLE || 'Sem título',
            value: parseFloat(deal.OPPORTUNITY) || 0,
            currency: deal.CURRENCY_ID || 'BRL',
            stage: deal.STAGE_ID || null,
            close_date: deal.CLOSEDATE || null,
            created_at_bitrix: deal.DATE_CREATE || null,
            synced_at: syncStartTime,
          }));

          if (dealsToUpsert.length > 0) {
            const { error: dealsError } = await supabase
              .from('bitrix_deals')
              .upsert(dealsToUpsert, { onConflict: 'bitrix_id' });

            if (dealsError) {
              console.error('Error upserting deals:', dealsError);
              throw new Error(`Database error: ${dealsError.message}`);
            }
            console.log(`Upserted ${dealsToUpsert.length} deals to database`);
          }

          // Update sync log with success
          if (syncLog) {
            await supabase
              .from('bitrix_sync_logs')
              .update({
                status: 'completed',
                clients_synced: clientsToUpsert.length,
                deals_synced: dealsToUpsert.length,
                completed_at: new Date().toISOString(),
              })
              .eq('id', syncLog.id);
          }

          // Build response with combined data
          const clients = (companiesData.result || []).map((company: any) => {
            const companyDeals = dealsByCompany[company.ID] || [];
            const totalSpent = companyDeals.reduce((sum: number, d: any) => sum + d.value, 0);
            
            return {
              id: company.ID,
              name: company.TITLE || 'Sem nome',
              ramo: company.UF_CRM_1590780873288 || 'Não informado',
              nicho: company.UF_CRM_1631795570468 || 'Não informado',
              primaryColor: parseColor(company.UF_CRM_1755898066),
              email: getFirstValue(company.EMAIL),
              phone: getFirstValue(company.PHONE),
              deals: companyDeals,
              totalSpent,
              lastPurchase: companyDeals[0]?.date || null,
            };
          });

          result = {
            clients,
            totalCompanies: companiesData.total || clients.length,
            totalDeals: dealsData.total || 0,
            nextCompanies: companiesData.next,
            syncedAt: syncStartTime,
            savedToDatabase: true,
          };

        } catch (syncError) {
          // Update sync log with error
          if (syncLog) {
            await supabase
              .from('bitrix_sync_logs')
              .update({
                status: 'failed',
                error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
                completed_at: new Date().toISOString(),
              })
              .eq('id', syncLog.id);
          }
          throw syncError;
        }
        break;
      }

      case 'get_stored_clients': {
        // Get clients from local database
        const supabase = getSupabaseClient();
        
        const { data: clients, error, count } = await supabase
          .from('bitrix_clients')
          .select('*', { count: 'exact' })
          .order('name', { ascending: true })
          .range(numField('start', 0), numField('start', 0) + numField('limit', 50) - 1);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        result = {
          clients: clients?.map(c => ({
            id: c.bitrix_id,
            name: c.name,
            ramo: c.ramo || 'Não informado',
            nicho: c.nicho || 'Não informado',
            primaryColor: { name: c.primary_color_name, hex: c.primary_color_hex, group: 'CUSTOM' },
            email: c.email,
            phone: c.phone,
            totalSpent: parseFloat(c.total_spent) || 0,
            lastPurchase: c.last_purchase_date,
            syncedAt: c.synced_at,
          })) || [],
          total: count || 0,
        };
        break;
      }

      case 'get_stored_deals': {
        // Get deals from local database
        const supabase = getSupabaseClient();
        
        let query = supabase
          .from('bitrix_deals')
          .select('*', { count: 'exact' })
          .order('created_at_bitrix', { ascending: false });

        const clientIdFilter = stringField('clientId');
        if (clientIdFilter) {
          query = query.eq('bitrix_client_id', clientIdFilter);
        }

        const { data: deals, error, count } = await query
          .range(numField('start', 0), numField('start', 0) + numField('limit', 50) - 1);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        result = {
          deals: deals?.map(d => ({
            id: d.bitrix_id,
            title: d.title,
            value: parseFloat(d.value) || 0,
            currency: d.currency,
            stage: d.stage,
            closeDate: d.close_date,
            createdAt: d.created_at_bitrix,
            syncedAt: d.synced_at,
          })) || [],
          total: count || 0,
        };
        break;
      }

      case 'get_sync_logs': {
        // Get sync history
        const supabase = getSupabaseClient();
        
        const { data: logs, error } = await supabase
          .from('bitrix_sync_logs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(numField('limit', 10));

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        result = { logs };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    if (error instanceof CircuitOpenError) {
      return circuitOpenResponse(error, corsHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bitrix24 sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
function parseColor(colorValue: string | null): { name: string; hex: string; group: string } {
  if (!colorValue) {
    return { name: 'Cinza', hex: '#6B7280', group: 'CINZA' };
  }
  
  // If it's already a hex color
  if (colorValue.startsWith('#')) {
    return { name: colorValue, hex: colorValue, group: 'CUSTOM' };
  }
  
  // Map common color names to hex
  const colorMap: Record<string, { hex: string; group: string }> = {
    'vermelho': { hex: '#EF4444', group: 'VERMELHO' },
    'azul': { hex: '#3B82F6', group: 'AZUL' },
    'verde': { hex: '#22C55E', group: 'VERDE' },
    'branco': { hex: '#FFFFFF', group: 'BRANCO' },
    'preto': { hex: '#1F2937', group: 'PRETO' },
    'laranja': { hex: '#F97316', group: 'LARANJA' },
    'amarelo': { hex: '#EAB308', group: 'AMARELO' },
    'rosa': { hex: '#EC4899', group: 'ROSA' },
    'cinza': { hex: '#6B7280', group: 'CINZA' },
    'prata': { hex: '#C0C0C0', group: 'PRATA' },
    'marrom': { hex: '#78350F', group: 'MARROM' },
    'roxo': { hex: '#8B5CF6', group: 'ROXO' },
    'dourado': { hex: '#D4AF37', group: 'DOURADO' },
  };

  const normalizedColor = colorValue.toLowerCase().trim();
  const mapped = colorMap[normalizedColor];
  
  if (mapped) {
    return { name: colorValue, ...mapped };
  }
  
  return { name: colorValue, hex: '#6B7280', group: 'CUSTOM' };
}

function parseColors(colorsValue: string | string[] | null): Array<{ name: string; hex: string; group: string }> {
  if (!colorsValue) return [];
  
  const colors = Array.isArray(colorsValue) ? colorsValue : colorsValue.split(',');
  return colors.map(c => parseColor(c.trim())).filter(c => c.hex !== '#6B7280');
}

function getFirstValue(field: any): string {
  if (!field) return '';
  if (Array.isArray(field) && field.length > 0) {
    return field[0]?.VALUE || field[0] || '';
  }
  if (typeof field === 'object' && field.VALUE) {
    return field.VALUE;
  }
  return String(field);
}

```

---

## 📁 Arquivos `_shared/*` usados pelas funções acima

### `supabase/functions/_shared/cors.ts`

```typescript
// supabase/functions/_shared/cors.ts
/**
 * Centralized CORS configuration — restrict to known origins.
 *
 * Observability: this module emits structured JSON logs (single-line) so they
 * are searchable in Supabase function logs. Event types:
 *   - cors_boot           → emitted once per cold start (config snapshot)
 *   - cors_preflight_ok   → 204 OPTIONS reply with allowed origin reflected
 *   - cors_preflight_warn → preflight from unknown origin OR requesting a
 *                           header that is NOT in Access-Control-Allow-Headers
 */

// --- Configuration ---

const EXACT_ALLOWED_ORIGINS = new Set([
  'https://criar-together-now.lovable.app',
  'https://id-preview--1be35a65-1f65-4c2b-9a79-7d563930aacd.lovable.app',
  'https://1be35a65-1f65-4c2b-9a79-7d563930aacd.lovableproject.com',
  'https://promogifts.com.br',
  'https://www.promogifts.com.br',
  'https://promogifts.atomicabr.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
]);

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.atomicabr\.com\.br$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

const ALLOWED_HEADERS_LIST = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-request-id',
  'x-step-up-token',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
];

const ALLOWED_HEADERS_SET = new Set(ALLOWED_HEADERS_LIST.map((h) => h.toLowerCase()));
const ALLOWED_HEADERS_VALUE = ALLOWED_HEADERS_LIST.join(', ');

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': ALLOWED_HEADERS_VALUE,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{{nonce}}' 'strict-dynamic'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
} as const;

// --- Internal Utilities ---

function parseHeaderList(headerString: string | null): string[] {
  if (!headerString) return [];
  return headerString
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string): boolean {
  return (
    EXACT_ALLOWED_ORIGINS.has(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
  );
}

function getBestAllowedOrigin(origin: string | null): string {
  const fallbackOrigin = 'https://criar-together-now.lovable.app';
  return origin && isAllowedOrigin(origin) ? origin : fallbackOrigin;
}

// --- Structured Logging ---

function logCorsEvent(event: string, fields: Record<string, unknown>): void {
  const payload = {
    source: 'cors',
    event,
    ts: new Date().toISOString(),
    ...fields,
  };
  const line = `[cors] ${JSON.stringify(payload)}`;
  
  if (event.endsWith('_warn') || event.endsWith('_blocked')) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

let bootLogged = false;
function logBootIfNeeded(): void {
  if (bootLogged) return;
  bootLogged = true;
  logCorsEvent('cors_boot', {
    allow_headers: ALLOWED_HEADERS_VALUE,
    allow_headers_count: ALLOWED_HEADERS_LIST.length,
    allow_methods: CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
    expose_headers: CORS_HEADERS_BASE['Access-Control-Expose-Headers'],
    exact_origins_count: EXACT_ALLOWED_ORIGINS.size,
    pattern_origins_count: ALLOWED_ORIGIN_PATTERNS.length,
  });
}

// Initialize boot log on module load
logBootIfNeeded();

function logPreflightFromRequest(req: Request, origin: string): void {
  const requestedHeadersRaw = req.headers.get('Access-Control-Request-Headers') || req.headers.get('access-control-request-headers');
  const requestedMethod = req.headers.get('Access-Control-Request-Method') || req.headers.get('access-control-request-method');
  const requestedHeaders = parseHeaderList(requestedHeadersRaw);
  
  const missingHeaders = requestedHeaders.filter((h) => !ALLOWED_HEADERS_SET.has(h));
  const originAllowed = !origin || isAllowedOrigin(origin);
  const requestId = req.headers.get('x-request-id') || req.headers.get('X-Request-Id');

  const baseFields = {
    request_id: requestId,
    origin: origin || null,
    origin_allowed: originAllowed,
    requested_method: requestedMethod,
    requested_headers: requestedHeaders,
    missing_headers: missingHeaders,
  };

  if (!originAllowed || missingHeaders.length > 0) {
    logCorsEvent('cors_preflight_warn', {
      ...baseFields,
      reason: !originAllowed ? 'origin_not_allowed' : 'header_not_allowed',
      hint: missingHeaders.length > 0
        ? `Add to ALLOWED_HEADERS_LIST in _shared/cors.ts: ${missingHeaders.join(', ')}`
        : 'Add origin to EXACT_ALLOWED_ORIGINS or ALLOWED_ORIGIN_PATTERNS',
    });
  } else {
    logCorsEvent('cors_preflight_ok', baseFields);
  }
}

// --- Public API ---

/**
 * Returns CORS headers with origin validation.
 * If the request origin is in the allowlist, it is reflected back.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || req?.headers.get('Origin') || '';
  
  if (req?.method === 'OPTIONS') {
    logPreflightFromRequest(req, origin);
  }

  // Security Headers for non-OPTIONS responses
  const securityHeaders = req?.method !== 'OPTIONS' ? {
    'X-Content-Type-Options': CORS_HEADERS_BASE['X-Content-Type-Options'],
    'X-Frame-Options': CORS_HEADERS_BASE['X-Frame-Options'],
    'Strict-Transport-Security': CORS_HEADERS_BASE['Strict-Transport-Security'],
    'Content-Security-Policy': CORS_HEADERS_BASE['Content-Security-Policy'],
  } : {};

  return {
    ...CORS_HEADERS_BASE,
    ...securityHeaders,
    'Access-Control-Allow-Origin': getBestAllowedOrigin(origin),
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns a Response if it's an OPTIONS request, null otherwise.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { headers: getCorsHeaders(req) });
}

export interface PublicCorsOptions {
  /**
   * Extra header tokens to append to Access-Control-Allow-Headers.
   */
  extraAllowHeaders?: string[];
  /**
   * Override Access-Control-Allow-Methods (default: same as restricted helper).
   */
  allowMethods?: string;
}

/**
 * Build CORS headers for public/wildcard endpoints.
 */
export function buildPublicCorsHeaders(opts: PublicCorsOptions = {}): Record<string, string> {
  const merged = new Set(ALLOWED_HEADERS_LIST.map((h) => h.toLowerCase()));
  for (const h of opts.extraAllowHeaders ?? []) {
    const t = h.trim().toLowerCase();
    if (t) merged.add(t);
  }
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': Array.from(merged).join(', '),
    'Access-Control-Allow-Methods': opts.allowMethods ?? CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
    'Access-Control-Expose-Headers': 'x-request-id',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
  };
}

/**
 * Unified preflight handler — works for BOTH public-wildcard and origin-restricted endpoints.
 */
export function handleCorsPreflight(
  req: Request,
  opts: { public?: boolean } & PublicCorsOptions = {},
): Response | null {
  if (req.method !== 'OPTIONS') return null;
  
  if (opts.public) {
    const origin = req.headers.get('origin') || req.headers.get('Origin') || '';
    logPreflightFromRequest(req, origin);
    return new Response(null, { headers: buildPublicCorsHeaders(opts) });
  }
  
  return new Response(null, { headers: getCorsHeaders(req) });
}

/**
 * @deprecated Use `buildPublicCorsHeaders()` or `handleCorsPreflight(req, { public: true })`.
 */
export const publicCorsHeaders = Object.freeze(buildPublicCorsHeaders());

/**
 * Exported for tests / introspection.
 */
export const CORS_INTROSPECTION = Object.freeze({
  allowHeaders: ALLOWED_HEADERS_VALUE,
  allowHeadersList: Object.freeze([...ALLOWED_HEADERS_LIST]),
  allowMethods: CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
  exposeHeaders: CORS_HEADERS_BASE['Access-Control-Expose-Headers'],
});



```

### `supabase/functions/_shared/request-id.ts`

```typescript
/**
 * Helpers para o request-id (correlation-id) propagado pelo client
 * via header `X-Request-Id`. Usado pelas bridges para correlacionar
 * uma chamada do frontend com os logs estruturados das edge functions.
 */

export const REQUEST_ID_HEADER = "X-Request-Id";

/** Lê o request-id do header ou gera um novo. */
export function getOrCreateRequestId(req: Request): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER) || req.headers.get("x-request-id");
  if (incoming && incoming.length >= 8 && incoming.length <= 128) return incoming;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback ultra-simples (boot só uma vez por isolate; aceitável).
  return `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Constrói um logger fininho que prefixa toda mensagem com [req_id=...]. */
export function makeRequestLogger(requestId: string) {
  const prefix = `[req_id=${requestId}]`;
  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}

/** Mescla `request_id` em um body JSON (objeto). Não modifica originais. */
export function withRequestIdBody<T>(body: T, requestId: string): T & { request_id: string } {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), request_id: requestId } as T & { request_id: string };
  }
  // Se body não for objeto, devolve {data: body, request_id} — aceitável p/ casos raros.
  return { data: body, request_id: requestId } as unknown as T & { request_id: string };
}

/** Adiciona `X-Request-Id` aos headers de resposta. */
export function withRequestIdHeader(headers: HeadersInit | undefined, requestId: string): HeadersInit {
  const merged = new Headers(headers || {});
  merged.set(REQUEST_ID_HEADER, requestId);
  return merged;
}

```

### `supabase/functions/_shared/credentials.ts`

```typescript
// supabase/functions/_shared/credentials.ts
// SSOT (Single Source of Truth) for credential resolution across all edge functions.
//
// Resolution order:
//   1) integration_credentials table (DB-first) — values entered via /admin/conexoes
//   2) Deno.env.get(name) fallback — legacy/bootstrap values
//   3) optional name aliases (different historical env names → canonical DB name)
//
// In-memory cache (60s TTL per isolate) avoids hammering the DB on hot paths.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface CacheEntry {
  value: string | null;
  source: CredentialSource;
  expires_at: number;
  stored_at: number;
}

export type CredentialSource = "db" | "env" | "none";

export interface CredentialResolution {
  value: string | null;
  source: CredentialSource;
  /** Canonical secret name actually resolved (after alias lookup). */
  resolved_name: string;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

const ALIASES: Record<string, string[]> = {
  EXTERNAL_PROMOBRIND_URL: ["EXTERNAL_SUPABASE_URL"],
  EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY: [
    "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY",
    "EXTERNAL_SUPABASE_SERVICE_KEY",
  ],
  EXTERNAL_PROMOBRIND_ANON_KEY: ["EXTERNAL_SUPABASE_ANON_KEY"],
  EXTERNAL_CRM_URL: ["CRM_SUPABASE_URL"],
  EXTERNAL_CRM_SERVICE_ROLE_KEY: ["CRM_SUPABASE_SERVICE_KEY"],
  EXTERNAL_CRM_ANON_KEY: ["CRM_SUPABASE_ANON_KEY"],
};

// =============================================================================
// Metrics: per-isolate (in-memory). Reset on isolate restart.
// =============================================================================

interface PerNameStats {
  hits: number;
  misses: number;
  expirations: number;
  resolutions: number;
  last_source: CredentialSource | null;
  last_resolved_at: number | null;
  last_duration_ms: number | null;
}

interface CacheMetricsState {
  /** Wall-clock ms when this isolate started collecting metrics. */
  started_at: number;
  hits: number;
  misses: number;
  expirations: number;
  resolutions: number;
  invalidations_single: number;
  invalidations_full: number;
  /** Rolling buffer of resolution durations (ms). Bounded for memory safety. */
  durations_ms: number[];
  per_name: Map<string, PerNameStats>;
}

const MAX_DURATIONS = 500;

const METRICS: CacheMetricsState = {
  started_at: Date.now(),
  hits: 0,
  misses: 0,
  expirations: 0,
  resolutions: 0,
  invalidations_single: 0,
  invalidations_full: 0,
  durations_ms: [],
  per_name: new Map(),
};

function getOrInitName(name: string): PerNameStats {
  let entry = METRICS.per_name.get(name);
  if (!entry) {
    entry = {
      hits: 0,
      misses: 0,
      expirations: 0,
      resolutions: 0,
      last_source: null,
      last_resolved_at: null,
      last_duration_ms: null,
    };
    METRICS.per_name.set(name, entry);
  }
  return entry;
}

function recordDuration(ms: number): void {
  METRICS.durations_ms.push(ms);
  if (METRICS.durations_ms.length > MAX_DURATIONS) {
    METRICS.durations_ms.splice(0, METRICS.durations_ms.length - MAX_DURATIONS);
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export interface CacheMetricsSnapshot {
  isolate_started_at: string;
  uptime_ms: number;
  cache: {
    size: number;
    ttl_ms: number;
    entries: Array<{
      name: string;
      source: CredentialSource;
      has_value: boolean;
      stored_at: string;
      expires_at: string;
      ttl_remaining_ms: number;
      expired: boolean;
    }>;
  };
  counters: {
    resolutions: number;
    hits: number;
    misses: number;
    expirations: number;
    invalidations_single: number;
    invalidations_full: number;
    hit_ratio: number;
  };
  duration_ms: {
    samples: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  per_name: Array<{
    name: string;
    hits: number;
    misses: number;
    expirations: number;
    resolutions: number;
    last_source: CredentialSource | null;
    last_resolved_at: string | null;
    last_duration_ms: number | null;
    hit_ratio: number;
  }>;
}

/** Public read-only snapshot of cache health for the current isolate. */
export function getCredentialCacheMetrics(): CacheMetricsSnapshot {
  const now = Date.now();
  const sorted = [...METRICS.durations_ms].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const avg = sorted.length ? sum / sorted.length : 0;
  const totalAccess = METRICS.hits + METRICS.misses;
  const hitRatio = totalAccess > 0 ? METRICS.hits / totalAccess : 0;

  return {
    isolate_started_at: new Date(METRICS.started_at).toISOString(),
    uptime_ms: now - METRICS.started_at,
    cache: {
      size: CACHE.size,
      ttl_ms: TTL_MS,
      entries: Array.from(CACHE.entries()).map(([name, e]) => ({
        name,
        source: e.source,
        has_value: e.value !== null,
        stored_at: new Date(e.stored_at).toISOString(),
        expires_at: new Date(e.expires_at).toISOString(),
        ttl_remaining_ms: Math.max(0, e.expires_at - now),
        expired: e.expires_at <= now,
      })),
    },
    counters: {
      resolutions: METRICS.resolutions,
      hits: METRICS.hits,
      misses: METRICS.misses,
      expirations: METRICS.expirations,
      invalidations_single: METRICS.invalidations_single,
      invalidations_full: METRICS.invalidations_full,
      hit_ratio: Number(hitRatio.toFixed(4)),
    },
    duration_ms: {
      samples: sorted.length,
      avg: Number(avg.toFixed(2)),
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted.length ? sorted[sorted.length - 1] : 0,
    },
    per_name: Array.from(METRICS.per_name.entries()).map(([name, s]) => {
      const access = s.hits + s.misses;
      return {
        name,
        hits: s.hits,
        misses: s.misses,
        expirations: s.expirations,
        resolutions: s.resolutions,
        last_source: s.last_source,
        last_resolved_at: s.last_resolved_at ? new Date(s.last_resolved_at).toISOString() : null,
        last_duration_ms: s.last_duration_ms,
        hit_ratio: access > 0 ? Number((s.hits / access).toFixed(4)) : 0,
      };
    }),
  };
}

// =============================================================================
// Credentials health summary — observability snapshot without exposing values.
// =============================================================================
// Reusable primitive consumed by edge functions that expose ?op=creds_health
// (currently crm-db-bridge; expand to quote-sync/expert-chat/quote-public-view
// in follow-up PRs). Returns presence/source/alias/length/suffix4 per name,
// plus an aggregated `health` flag.
//
// Health aggregation rules (URL é considerada o pivô — sem URL nada conecta):
//   - "missing"   : nenhum dos nomes "URL" está presente
//   - "degraded"  : URL presente, mas zero "key" presente
//   - "healthy"   : URL presente E ao menos 1 "key" presente
//
// Para detectar URL, consideramos `name.endsWith("_URL")`. Mantemos simples;
// edge fns com nomenclatura diferente podem passar `urlNames`/`keyNames`
// explicitamente.

export interface CredentialHealthEntry {
  name: string;
  present: boolean;
  source: CredentialSource;
  via_alias: boolean;
  resolved_name: string;
  value_length: number;
  /** Last 4 chars of the secret value, for ops to fingerprint without leaking. */
  suffix4: string | null;
}

export interface CredentialsHealthSummary {
  ok: true;
  ts: number;
  health: "healthy" | "degraded" | "missing";
  credentials: CredentialHealthEntry[];
}

export interface BuildCredentialsHealthOptions {
  /**
   * Name suffixes that identify URL-like credentials. Defaults to ["_URL"].
   * Used for the "missing" classification (no URL → missing).
   */
  urlSuffixes?: string[];
  /** Optional service client to pass through to resolveCredential. */
  serviceClient?: SupabaseClient | null;
}

function summarizeCredential(name: string, res: CredentialResolution): CredentialHealthEntry {
  return {
    name,
    present: res.value !== null,
    source: res.source,
    via_alias: res.resolved_name !== name,
    resolved_name: res.resolved_name,
    value_length: res.value?.length ?? 0,
    suffix4: res.value ? res.value.slice(-4) : null,
  };
}

/**
 * Resolve uma lista de credenciais e devolve um snapshot agregado de saúde,
 * sem expor valores. Usado por endpoints `?op=creds_health` em edge functions
 * que dependem de credenciais externas (CRM, Promobrind, etc).
 */
export async function buildCredentialsHealth(
  names: readonly string[],
  options: BuildCredentialsHealthOptions = {},
): Promise<CredentialsHealthSummary> {
  const urlSuffixes = options.urlSuffixes ?? ["_URL"];
  const resolutions = await Promise.all(
    names.map((name) => resolveCredential(name, options.serviceClient)),
  );
  const credentials = names.map((name, i) => summarizeCredential(name, resolutions[i]));

  const isUrlName = (n: string) => urlSuffixes.some((suf) => n.endsWith(suf));
  const urlEntries = credentials.filter((c) => isUrlName(c.name));
  const keyEntries = credentials.filter((c) => !isUrlName(c.name));

  const anyUrlPresent = urlEntries.some((c) => c.present);
  const anyKeyPresent = keyEntries.some((c) => c.present);

  const health: CredentialsHealthSummary["health"] = !anyUrlPresent
    ? "missing"
    : !anyKeyPresent
      ? "degraded"
      : "healthy";

  return {
    ok: true,
    ts: Date.now(),
    health,
    credentials,
  };
}

/** Reset all in-memory metrics. Cache itself is NOT cleared. */
export function resetCredentialCacheMetrics(): void {
  METRICS.started_at = Date.now();
  METRICS.hits = 0;
  METRICS.misses = 0;
  METRICS.expirations = 0;
  METRICS.resolutions = 0;
  METRICS.invalidations_single = 0;
  METRICS.invalidations_full = 0;
  METRICS.durations_ms = [];
  METRICS.per_name.clear();
}

export function invalidateCredentialCache(name?: string): void {
  if (name) {
    CACHE.delete(name);
    METRICS.invalidations_single += 1;
    for (const [canonical] of Object.entries(ALIASES)) {
      if (canonical === name) CACHE.delete(canonical);
    }
  } else {
    CACHE.clear();
    METRICS.invalidations_full += 1;
  }
}

let internalServiceClient: SupabaseClient | null = null;
function getInternalServiceClient(): SupabaseClient | null {
  if (internalServiceClient) return internalServiceClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  internalServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return internalServiceClient;
}

interface ResolutionLogPayload {
  event: "credential_resolved";
  name: string;
  resolved_name: string;
  source: CredentialSource;
  has_value: boolean;
  value_length: number;
  cached: boolean;
  duration_ms: number;
  via_alias: boolean;
  error?: string;
}

function logResolution(payload: ResolutionLogPayload): void {
  if (Deno.env.get("LOG_CREDENTIAL_RESOLUTION") === "off") return;
  try {
    console.log("[credentials] " + JSON.stringify(payload));
  } catch {
    // Never let logging break credential resolution
  }
}

function recordResolution(opts: {
  name: string;
  source: CredentialSource;
  duration_ms: number;
  cached: boolean;
  expired_before: boolean;
}): void {
  METRICS.resolutions += 1;
  if (opts.cached) METRICS.hits += 1;
  else METRICS.misses += 1;
  if (opts.expired_before) METRICS.expirations += 1;
  recordDuration(opts.duration_ms);

  const stats = getOrInitName(opts.name);
  stats.resolutions += 1;
  if (opts.cached) stats.hits += 1;
  else stats.misses += 1;
  if (opts.expired_before) stats.expirations += 1;
  stats.last_source = opts.source;
  stats.last_resolved_at = Date.now();
  stats.last_duration_ms = opts.duration_ms;
}

/**
 * Resolve a credential by name with full provenance metadata.
 * Always prefers DB; falls back to env (and to legacy env aliases).
 */
export async function resolveCredential(
  name: string,
  serviceClient?: SupabaseClient | null,
): Promise<CredentialResolution> {
  const startedAt = Date.now();
  const cached = CACHE.get(name);
  const expiredBefore = !!cached && cached.expires_at <= startedAt;

  if (cached && cached.expires_at > startedAt) {
    const value = cached.value;
    const duration = Date.now() - startedAt;
    recordResolution({ name, source: cached.source, duration_ms: duration, cached: true, expired_before: false });
    logResolution({
      event: "credential_resolved",
      name,
      resolved_name: name,
      source: cached.source,
      has_value: value !== null,
      value_length: value ? value.length : 0,
      cached: true,
      duration_ms: duration,
      via_alias: false,
    });
    return { value, source: cached.source, resolved_name: name };
  }

  const client = serviceClient ?? getInternalServiceClient();
  let dbError: string | undefined;

  // 1) DB
  if (client) {
    try {
      const { data, error } = await client
        .from("integration_credentials")
        .select("secret_value")
        .eq("secret_name", name)
        .maybeSingle();
      if (!error && data?.secret_value) {
        const value = data.secret_value as string;
        const now = Date.now();
        CACHE.set(name, { value, source: "db", expires_at: now + TTL_MS, stored_at: now });
        const duration = Date.now() - startedAt;
        recordResolution({ name, source: "db", duration_ms: duration, cached: false, expired_before: expiredBefore });
        logResolution({
          event: "credential_resolved",
          name,
          resolved_name: name,
          source: "db",
          has_value: true,
          value_length: value.length,
          cached: false,
          duration_ms: duration,
          via_alias: false,
        });
        return { value, source: "db", resolved_name: name };
      }
      if (error) dbError = error.message;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
      console.error("[credentials] DB read failed for", name, err);
    }
  }

  // 2) Env at canonical name
  const envCanonical = Deno.env.get(name);
  if (envCanonical) {
    const now = Date.now();
    CACHE.set(name, { value: envCanonical, source: "env", expires_at: now + TTL_MS, stored_at: now });
    const duration = Date.now() - startedAt;
    recordResolution({ name, source: "env", duration_ms: duration, cached: false, expired_before: expiredBefore });
    logResolution({
      event: "credential_resolved",
      name,
      resolved_name: name,
      source: "env",
      has_value: true,
      value_length: envCanonical.length,
      cached: false,
      duration_ms: duration,
      via_alias: false,
      error: dbError,
    });
    return { value: envCanonical, source: "env", resolved_name: name };
  }

  // 3) Env at legacy aliases
  for (const alias of ALIASES[name] ?? []) {
    const v = Deno.env.get(alias);
    if (v) {
      const now = Date.now();
      CACHE.set(name, { value: v, source: "env", expires_at: now + TTL_MS, stored_at: now });
      const duration = Date.now() - startedAt;
      recordResolution({ name, source: "env", duration_ms: duration, cached: false, expired_before: expiredBefore });
      logResolution({
        event: "credential_resolved",
        name,
        resolved_name: alias,
        source: "env",
        has_value: true,
        value_length: v.length,
        cached: false,
        duration_ms: duration,
        via_alias: true,
        error: dbError,
      });
      return { value: v, source: "env", resolved_name: alias };
    }
  }

  const now = Date.now();
  CACHE.set(name, { value: null, source: "none", expires_at: now + TTL_MS, stored_at: now });
  const duration = Date.now() - startedAt;
  recordResolution({ name, source: "none", duration_ms: duration, cached: false, expired_before: expiredBefore });
  logResolution({
    event: "credential_resolved",
    name,
    resolved_name: name,
    source: "none",
    has_value: false,
    value_length: 0,
    cached: false,
    duration_ms: duration,
    via_alias: false,
    error: dbError,
  });
  return { value: null, source: "none", resolved_name: name };
}

/** Convenience: just the value (or null). Backwards-compatible. */
export async function getCredential(
  name: string,
  serviceClient?: SupabaseClient | null,
): Promise<string | null> {
  const { value } = await resolveCredential(name, serviceClient);
  return value;
}

/** Resolve many credentials in parallel. */
export async function resolveCredentials(
  names: string[],
  serviceClient?: SupabaseClient | null,
): Promise<Record<string, CredentialResolution>> {
  const entries = await Promise.all(
    names.map(async (n) => [n, await resolveCredential(n, serviceClient)] as const),
  );
  return Object.fromEntries(entries);
}

```

### `supabase/functions/_shared/circuit-breaker.ts`

```typescript
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

```

### `supabase/functions/_shared/external-fetch.ts`

```typescript
/**
 * Wrapper resiliente para fetch a APIs externas com circuit breaker integrado.
 *
 * Uso:
 *   import { fetchWithBreaker } from "../_shared/external-fetch.ts";
 *   const res = await fetchWithBreaker("bitrix", "https://api.bitrix.com/...", { method: "POST" });
 *
 * Hardening defensivo:
 * - Rejeita URLs sem `https://` (anti-SSRF). Em testes locais, `ALLOW_HTTP_FETCH=1` libera HTTP.
 * - Falhas HTTP 5xx/network contam como falha; 2xx/3xx/4xx contam como sucesso.
 * - Se circuito OPEN, lança `CircuitOpenError` imediatamente.
 */
import { getBreaker } from "./circuit-breaker.ts";

export class CircuitOpenError extends Error {
  constructor(public service: string) {
    super(`circuit_open:${service}`);
    this.name = "CircuitOpenError";
  }
}

export class InsecureUrlError extends Error {
  constructor(public url: string) {
    super(`insecure_url:${url}`);
    this.name = "InsecureUrlError";
  }
}

function assertSecureUrl(url: string | URL): void {
  const allowHttp = Deno.env.get("ALLOW_HTTP_FETCH") === "1";
  const u = typeof url === "string" ? url : url.toString();
  if (allowHttp) return;
  if (!u.startsWith("https://")) {
    throw new InsecureUrlError(u);
  }
}

export async function fetchWithBreaker(
  service: string,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  assertSecureUrl(url);

  const breaker = getBreaker(service);
  if (!breaker.canRequest()) {
    throw new CircuitOpenError(service);
  }

  try {
    const res = await fetch(url, init);
    if (res.status >= 500) {
      breaker.recordFailure();
    } else {
      breaker.recordSuccess();
    }
    return res;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

/**
 * Helper para responder 503 + Retry-After quando circuito aberto.
 * Use em catch blocks: `if (err instanceof CircuitOpenError) return circuitOpenResponse(err, corsHeaders);`
 */
export function circuitOpenResponse(
  err: CircuitOpenError,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Service temporarily unavailable",
      service: err.service,
      retry_after_seconds: 60,
    }),
    {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}

```

### `supabase/functions/_shared/external-db-telemetry.ts`

```typescript
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

```

### `supabase/functions/_shared/external-db-cache.ts`

```typescript
// supabase/functions/_shared/external-db-cache.ts
// In-memory cache (survives across requests within same isolate).
//
// Suporta TTL por entrada para diferenciar:
//   - Tabelas estáticas (categorias, fornecedores) → 10min
//   - Listings dinâmicos (products lightweight) → 60s
//
// O TTL default permanece 10min para preservar compatibilidade com chamadas
// existentes que não passam ttlMs explícito.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10min — tabelas estáticas
const referenceCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = referenceCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    referenceCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Armazena valor com TTL opcional. Default = 10min.
 * Use TTL menor (ex.: 60_000) para listings dinâmicos.
 */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  referenceCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

```

### `supabase/functions/_shared/external-db-aliases.ts`

```typescript
// supabase/functions/_shared/external-db-aliases.ts
// Alias resolution and field mapping for external DB schema compatibility

// ============================================
// Table alias detection
// ============================================

export function isTechniqueTableAlias(table: string) {
  return table === 'personalization_techniques' || table === 'tecnica_gravacao';
}

export function isTechniqueVarianteAlias(table: string) {
  return table === 'tecnica_gravacao_variante';
}

export function isCustomizationPriceTablesAlias(table: string) {
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
}

// ============================================
// Product field sanitization
// ============================================

const PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA = new Set([
  'cest', 'freight_class', 'default_carrier', 'shipping_weight_kg',
  'shipping_width_cm', 'shipping_height_cm', 'shipping_length_cm',
  'cubic_weight', 'requires_special_shipping', 'shipping_notes',
  'cfop', 'csosn', 'icms_rate', 'pis_rate', 'cofins_rate', 'tax_regime',
  'stock_unit', 'has_commercial_packaging',
  'box_internal_height_cm', 'box_internal_width_cm', 'box_internal_length_cm',
  'country_of_origin', 'image_url',
]);

const PRODUCT_FIELD_RENAME_MAP: Record<string, string> = {
  'country_of_origin': 'origin_country',
};

export function sanitizeExternalWriteData(table: string, data: Record<string, unknown>) {
  if (table !== 'products') return data;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA.has(key)) {
      const renamed = PRODUCT_FIELD_RENAME_MAP[key];
      if (renamed) result[renamed] = value;
      continue;
    }
    result[key] = value;
  }
  return result;
}

// ============================================
// Price table mapping (customization_price_tables → tabela_preco_fornecedores_gravacao)
// ============================================

export function mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  if ('table_code' in out) { out.tecnica_codigo = out.table_code; delete out.table_code; }
  if ('table_code_option' in out) { out.table_code = out.table_code_option; delete out.table_code_option; }
  if ('table_fullcode' in out) { out.table_code = out.table_fullcode; delete out.table_fullcode; }
  if ('technique_id' in out) { delete out.technique_id; }
  if ('customization_type_name' in out) { out.tecnica_codigo = out.customization_type_name; delete out.customization_type_name; }
  return out;
}

export function mapPriceTableOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'table_code', ascending: true };
  const columnMap: Record<string, string> = {
    'table_code': 'table_code', 'table_code_option': 'table_code',
    'customization_type_name': 'tecnica_codigo', 'max_colors': 'max_colors',
    'display_order': 'table_code', 'is_active': 'is_active',
  };
  return { column: columnMap[orderBy.column] || 'table_code', ascending: orderBy.ascending ?? true };
}

export function mapPriceTableRowToLegacyShape(row: Record<string, unknown>) {
  return {
    ...row,
    id: row.id,
    table_code: row.table_code,
    table_code_option: row.table_code,
    table_fullcode: row.table_code,
    customization_type_name: row.tecnica_codigo,
    tecnica_codigo: row.tecnica_codigo,
    max_colors: row.max_colors,
    max_area_width_cm: row.max_area_width_cm,
    max_area_height_cm: row.max_area_height_cm,
    price_by_color: row.price_by_color ?? false,
    price_by_area: row.price_by_area ?? false,
    setup_price: row.setup_price ?? 0,
    handling_price: 0,
    is_active: row.is_active ?? true,
    min_qty_1: row.min_qty_1, min_qty_2: row.min_qty_2, min_qty_3: row.min_qty_3,
    min_qty_4: row.min_qty_4, min_qty_5: row.min_qty_5,
    price_1: row.price_1, price_2: row.price_2, price_3: row.price_3,
    price_4: row.price_4, price_5: row.price_5,
  };
}

// ============================================
// Technique mapping (personalization_techniques → tabela_preco_gravacao_oficial)
// ============================================

export function mapTechniqueFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  if ('is_active' in out) { out.ativo = out.is_active; delete out.is_active; }
  if ('code' in out) { out.codigo = out.code; delete out.code; }
  if ('name' in out) { out.nome = out.name; delete out.name; }
  if ('description' in out) { out.descricao = out.description; delete out.description; }
  if ('max_colors' in out) { out.max_cores = out.max_colors; delete out.max_colors; }
  if ('estimated_days' in out) { out.tempo_producao_dias = out.estimated_days; delete out.estimated_days; }
  return out;
}

export function mapTechniqueOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'nome', ascending: true };
  const columnMap: Record<string, string> = {
    name: 'nome', nome: 'nome', code: 'codigo', codigo: 'codigo',
    is_active: 'ativo', ativo: 'ativo', estimated_days: 'tempo_producao_dias',
    tempo_producao_dias: 'tempo_producao_dias', ordem_exibicao: 'nome', display_order: 'nome',
  };
  return { ...orderBy, column: columnMap[orderBy.column] ?? orderBy.column };
}

export function mapTechniqueRowToLegacyShape(row: Record<string, unknown>) {
  const codigo = (row.codigo as string | undefined) ?? null;
  const nome = (row.nome as string | undefined) ?? '';
  const descricao = (row.descricao as string | undefined) ?? null;
  const ativo = (row.ativo as boolean | undefined) ?? true;
  const tempo = (row.tempo_producao_dias as number | undefined) ?? null;
  const maxCores = typeof row.max_cores === 'number' ? row.max_cores : null;
  const cobraPorCor = (row.cobra_por_cor as boolean | undefined) ?? false;
  const custoSetup = typeof row.custo_setup === 'number' ? row.custo_setup : 0;

  return {
    ...row,
    codigo, codigo_interno: (row.codigo_curto as string | undefined) ?? codigo,
    nome, slug: (row.slug_grupo as string | undefined) ?? '',
    descricao,
    permite_cores: maxCores != null && maxCores > 0,
    max_cores: maxCores, cobra_por_cor: cobraPorCor,
    cobra_por_area: false, cobra_por_pontos: false,
    requer_setup: custoSetup > 0,
    tipo_setup: custoSetup > 0 ? 'arte_digital' : 'nenhum',
    tempo_producao_dias: tempo,
    ordem_exibicao: (row.ordem_exibicao as number | undefined) ?? 0,
    ativo,
    code: codigo, name: nome, description: descricao,
    is_active: ativo, estimated_days: tempo,
    requires_color_count: maxCores != null && maxCores > 0,
    max_colors: maxCores,
    display_order: (row.ordem_exibicao as number | undefined) ?? 0,
    price_by_color: cobraPorCor, price_by_area: false,
    setup_cost: custoSetup, unit_cost: null, min_quantity: null,
    setup_price: custoSetup,
    handling_price: (row.custo_manuseio as number | undefined) ?? 0,
    grupo_tecnica: row.grupo_tecnica, nome_grupo: row.nome_grupo,
    slug_grupo: row.slug_grupo,
    ordem_grupo: (row.ordem_exibicao as number | undefined) ?? 0,
    custo_setup: custoSetup, custo_aplicacao: row.custo_aplicacao,
    cobra_aplicacao: row.cobra_aplicacao,
  };
}

// ============================================
// Resolve alias: returns the real table name and applies filter/order transforms
// ============================================
export interface AliasResolution {
  table: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  select: string;
  aliasType: 'technique' | 'variante' | 'priceTable' | null;
  parentTechniqueId?: unknown;
}

export function resolveTableAlias(
  table: string,
  filters?: Record<string, unknown>,
  orderBy?: { column: string; ascending?: boolean },
  select?: string,
): AliasResolution {
  if (isTechniqueTableAlias(table)) {
    return {
      table: 'tabela_preco_gravacao_oficial',
      filters: mapTechniqueFiltersToExternal(filters),
      orderBy: mapTechniqueOrderByToExternal(orderBy),
      select: '*',
      aliasType: 'technique',
    };
  }

  if (isTechniqueVarianteAlias(table)) {
    let parentTechniqueId: unknown;
    const resolvedFilters = filters ? { ...filters } : undefined;
    if (resolvedFilters?.tecnica_gravacao_id) {
      parentTechniqueId = resolvedFilters.tecnica_gravacao_id;
      delete resolvedFilters.tecnica_gravacao_id;
    }
    return {
      table: 'tabela_preco_gravacao_oficial',
      filters: resolvedFilters,
      select: '*',
      aliasType: 'variante',
      parentTechniqueId,
      orderBy,
    };
  }

  if (isCustomizationPriceTablesAlias(table)) {
    return {
      table: 'tabela_preco_fornecedores_gravacao',
      filters: mapPriceTableFiltersToExternal(filters),
      orderBy: mapPriceTableOrderByToExternal(orderBy),
      select: '*',
      aliasType: 'priceTable',
    };
  }

  return { table, filters, orderBy, select: select || '*', aliasType: null };
}

```

### `supabase/functions/_shared/external-db-config.ts`

```typescript
// supabase/functions/_shared/external-db-config.ts
// Table whitelists, permissions, types for external-db-bridge

export type ResourceGroup = 'products' | 'companies' | 'views';
export type Operation = 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'upsert' | 'batch_insert';

// Whitelist de RPCs permitidas
export const ALLOWED_RPCS = [
  'fn_get_product_print_areas',
  'fn_get_product_print_areas_v2',
  'fn_get_product_customization_options',
  'fn_link_product_print_areas',
  'fn_backfill_product_print_areas',
  'fn_get_customization_price',
  'fn_get_customization_price_v2',
  'fn_find_fornecedor_price_table',
  'get_category_descendants',
] as const;

// Tabelas relacionadas a PRODUTOS (CRUD completo)
export const PRODUCT_TABLES = [
  'products',
  'categories',
  'suppliers',
  'tags',
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_categories',
  'product_category_assignments',
  'product_suppliers',
  'product_print_areas',
  'product_kit_components',
  'product_attributes',
  'color_groups',
  'color_nuances',
  'color_equivalences',
  'color_variations',
  'supplier_colors',
  'material_groups',
  'material_types',
  'material_variations',
  'supplier_materials',
  'supplier_attribute_definitions',
  'supplier_product_attributes',
  'category_attributes',
  'price_lists',
  'variant_cost_tiers',
  'variant_sale_prices',
  'variation_types',
  'variation_values',
  'stock_movements',
  'variant_supplier_sources',
  'supplier_branches',
  'collections',
  'collection_products',
  'ramo_atividade',
  'ramo_atividade_filho',
  'produto_ramo_atividade',
  'personalization_techniques',
  'customization_price_tables',
  'customization_price_tiers',
  'tecnicas_gravacao',
  'print_area_techniques',
  'tabela_preco_gravacao_oficial',
  'tabela_preco_gravacao_oficial_faixa',
  'organization_markup_customization',
  'category_area_techniques',
  'tabela_preco_fornecedores_gravacao',
  'price_history',
  'stock_snapshots',
  'stock_daily_summary',
  'product_groups',
  'product_group_members',
  'product_relationships',
] as const;

// Views e Materialized Views (somente leitura)
export const PRODUCT_VIEWS = [
  'v_products_with_techniques',
  'v_products_with_stock',
  'v_products_with_tags',
  'v_products_min_price',
  'v_products_without_images',
  'v_products_without_videos',
  'v_products_missing_primary_image',
  'v_product_print_areas_complete',
  'v_product_images_cdn',
  'v_product_videos_cdn',
  'v_product_attributes_formatted',
  'v_kit_with_components',
  'v_kit_component_print_areas',
  'v_customization_price_summary',
  'v_variant_pricing_complete',
  'v_technique_stats',
  'v_techniques_stricker_mapping',
  'v_media_stats',
  'v_n8n_sync_summary',
  'v_n8n_sync_errors',
  'v_n8n_sync_success_recent',
  'mv_product_compositions',
  'mv_material_group_stats',
  'materials_complete',
  'products_with_materials',
  'categories_tree_visual',
  'mv_stock_velocity',
  'mv_product_intelligence',
] as const;

// Tabelas relacionadas a EMPRESAS/CLIENTES (somente leitura)
export const COMPANY_TABLES = [
  'bitrix_clients',
  'client_contacts',
  'client_notes',
  'organizations',
  'user_organizations',
  'business_sectors',
] as const;

// Tabelas de sistema que NÃO devem ser acessadas
export const SYSTEM_TABLES = [
  'user_roles', 'user_onboarding', 'profiles', 'user_filter_presets',
  'user_favorites', 'user_rewards', 'notification_preferences',
  'notification_templates', 'notifications', 'push_subscriptions',
  'analytics_events', 'audit_log', 'search_queries', 'sync_jobs',
  'feature_flags', 'system_settings', 'payments', 'orders', 'order_items',
  'quotes', 'quote_items', 'quote_versions', 'quote_templates',
  'quote_comments', 'achievements', 'seller_achievements',
  'seller_gamification', 'store_rewards', 'expert_conversations',
  'expert_messages', 'saved_filters', 'geo_allowed_countries',
  'media_sync_log', 'category_sync_log',
] as const;

export type ProductTable = typeof PRODUCT_TABLES[number];
export type ProductView = typeof PRODUCT_VIEWS[number];
export type CompanyTable = typeof COMPANY_TABLES[number];

// Permissões por grupo
export const PERMISSIONS: Record<ResourceGroup, Operation[]> = {
  products: ['select', 'insert', 'update', 'delete', 'upsert', 'batch_insert'],
  companies: ['select'],
  views: ['select'],
};

// Tabelas sensíveis — exigem JWT mesmo para leitura
export const SENSITIVE_TABLES = new Set([
  'variant_supplier_sources',
  'variant_cost_tiers',
  'variant_sale_prices',
  'price_lists',
  'price_history',
  'organization_markup_customization',
  'tabela_preco_fornecedores_gravacao',
  'tabela_preco_gravacao_oficial',
  'tabela_preco_gravacao_oficial_faixa',
  'supplier_branches',
  'stock_snapshots',
  'stock_daily_summary',
  'mv_stock_velocity',
  'mv_product_intelligence',
]);

// Heavy tables for adaptive pagination
export const HEAVY_TABLES = ['products', 'product_images', 'product_variants', 'color_variations', 'product_categories', 'product_category_assignments'];
export const VERY_HEAVY_TABLES = ['products', 'product_images'];

// Tables with non-standard timestamp columns
export const TABLES_WITHOUT_CREATED_AT = [
  'variant_supplier_sources',
  'price_history',
  'collection_products',
  'stock_snapshots',
  'stock_daily_summary',
];
export const TABLES_WITHOUT_UPDATED_AT = [
  'product_tags',
  'produto_ramo_atividade',
  'price_history',
  'collection_products',
  'product_category_assignments',
  'stock_snapshots',
  'stock_daily_summary',
];

export function getResourceGroup(tableName: string): ResourceGroup | null {
  if (PRODUCT_TABLES.includes(tableName as ProductTable)) return 'products';
  if (PRODUCT_VIEWS.includes(tableName as ProductView)) return 'views';
  if (COMPANY_TABLES.includes(tableName as CompanyTable)) return 'companies';
  return null;
}

```

### `supabase/functions/_shared/supabase-client-adapter.ts`

```typescript
// _shared/supabase-client-adapter.ts
// ----------------------------------------------------------------------------
// Adapter centralizado para resolver incompatibilidades de tipagem do
// `SupabaseClient` entre edge functions. Diferentes módulos importam o SDK
// de versões distintas (2.45.0 / 2.49.4 / 2.95.0) e/ou com genéricos diferentes
// (`SupabaseClient<Database, 'public'>` vs `SupabaseClient<any, never>`),
// o que produz erros de TS2345 ("Type 'public' is not assignable to type 'never'")
// e quebra `client.rpc<T>()` (T colapsando para `unknown` por PromiseLike).
//
// Este módulo expõe:
//   • `CompatibleSupabaseClient<DB, Schema>` — tipo genérico estruturalmente
//     compatível com qualquer SupabaseClient com schema "public" por padrão.
//   • `ServiceClient` — alias canônico (default `SupabaseClient`) usado por
//     helpers internos que esperam a forma "default".
//   • `assertServiceClient(client)` — runtime guard com mensagem descritiva.
//   • `castSupabaseClient(client)` — narrow type-safe (com guard opcional)
//     para o alias canônico, eliminando casts ad-hoc espalhados no código.
//   • `castRpcResult<T>(promise)` — wrapper que normaliza `PromiseLike<T>`
//     retornado por `.rpc()` em `Promise<T>` real, preservando o genérico.
// ----------------------------------------------------------------------------

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/** Alias canônico do client default (schema "public"). */
export type ServiceClient = SupabaseClient;

/**
 * Tipo genérico estruturalmente compatível com SupabaseClient.
 * Aceita qualquer Database / SchemaName, com default "public" — cobre 100%
 * dos call sites atuais sem forçar usuários a importar `Database`.
 */
export type CompatibleSupabaseClient<
  // deno-lint-ignore no-explicit-any
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public" & string
    : string & keyof Database,
> = SupabaseClient<Database, SchemaName>;

/**
 * Runtime guard: verifica forma estrutural mínima de um SupabaseClient
 * (`.from()`, `.rpc()`, `.auth`). Lança TypeError descritivo se inválido.
 *
 * Use quando o client vier de fonte não-confiável (params externos, mocks).
 */
export function assertServiceClient(
  client: unknown,
  context = "supabase-client-adapter",
): asserts client is ServiceClient {
  if (!client || typeof client !== "object") {
    throw new TypeError(
      `[${context}] service client inválido: esperado SupabaseClient, recebeu ${
        client === null ? "null" : typeof client
      }`,
    );
  }
  const c = client as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof c.from !== "function") missing.push(".from()");
  if (typeof c.rpc !== "function") missing.push(".rpc()");
  if (typeof c.auth !== "object" || c.auth === null) missing.push(".auth");
  if (missing.length > 0) {
    throw new TypeError(
      `[${context}] service client não satisfaz forma de SupabaseClient — ` +
        `faltando: ${missing.join(", ")}. Verifique se createClient<Database, 'public'> ` +
        `está alinhado com o schema esperado.`,
    );
  }
}

/**
 * Narrow type-safe de qualquer SupabaseClient compatível para o alias
 * canônico `ServiceClient`. Substitui os `as unknown as SupabaseClient`
 * espalhados pelas edge functions.
 *
 * @param client  Cliente Supabase (qualquer versão / genéricos compatíveis).
 * @param opts.validate  Quando true, executa `assertServiceClient` antes do cast.
 * @param opts.context   Identificador para mensagens de erro do guard.
 */
export function castSupabaseClient<
  // deno-lint-ignore no-explicit-any
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public" & string
    : string & keyof Database,
>(
  client: CompatibleSupabaseClient<Database, SchemaName> | unknown,
  opts: { validate?: boolean; context?: string } = {},
): ServiceClient {
  if (opts.validate) {
    assertServiceClient(client, opts.context ?? "castSupabaseClient");
  }
  return client as unknown as ServiceClient;
}

/**
 * Normaliza o retorno de `client.rpc<T>(...)` (que é `PromiseLike<T>` no SDK
 * e por isso colapsa o genérico T para `unknown` em alguns contextos) em uma
 * `Promise<T>` real, preservando o tipo genérico passado pelo caller.
 *
 * Uso:
 *   const { data, error } = await castRpcResult<MyRow[]>(supabase.rpc("fn", args));
 */
export function castRpcResult<T>(thenable: PromiseLike<T>): Promise<T> {
  return Promise.resolve(thenable);
}

```

### `supabase/functions/_shared/retry-backoff.ts`

```typescript
// supabase/functions/_shared/retry-backoff.ts
// Centralized retry policy with exponential backoff + decorrelated jitter.
//
// Why decorrelated jitter:
//   - Pure exponential backoff causes "thundering herd" when many parallel
//     callers (catalog fan-out, dashboards) retry on the same beat.
//   - Decorrelated jitter spreads retries across the [base, prevSleep*3] window,
//     converging faster on success while keeping tail latency bounded.
//   - Reference: AWS Architecture Blog — "Exponential Backoff And Jitter".
//
// We also enforce a hard `budgetMs` so the retry loop cannot exceed the time
// the caller is willing to wait — important for parallel batches where one
// slow query must not block the whole response.

export interface RetryOptions {
  /** Max attempts INCLUDING the first. Default: 3. */
  maxAttempts?: number;
  /** Base delay in ms (lower bound for the first sleep). Default: 80ms. */
  baseMs?: number;
  /** Cap for any single sleep, in ms. Default: 1500ms. */
  capMs?: number;
  /** Hard total budget for all retries combined. Default: 4000ms. */
  budgetMs?: number;
  /** Classifier — return true if the error is worth retrying. */
  isTransient?: (err: unknown) => boolean;
  /** Optional tag for logs. */
  label?: string;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
  totalMs: number;
}

const DEFAULT_TRANSIENT_PATTERNS = [
  'statement timeout',
  'canceling statement',
  'connection reset',
  'connection terminated',
  'econnreset',
  'etimedout',
  'fetch failed',
  'network',
  '503',
  '504',
  '57014', // query_canceled
  '08006', // connection_failure
  '08000', // connection_exception
];

export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return DEFAULT_TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Decorrelated jitter:
 *   sleep_n = min(cap, random_between(base, prev * 3))
 * Ensures non-monotonic, well-spread retry instants under high parallelism.
 */
export function nextDelayMs(prevMs: number, baseMs: number, capMs: number): number {
  const lo = baseMs;
  const hi = Math.max(baseMs, Math.min(capMs, prevMs * 3));
  const raw = lo + Math.random() * (hi - lo);
  return Math.min(capMs, Math.round(raw));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` with retry + decorrelated jitter. Stops early on:
 *   - success
 *   - non-transient error (returned/thrown immediately)
 *   - budget exhaustion
 *   - max attempts reached
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<RetryResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 80;
  const capMs = opts.capMs ?? 1500;
  const budgetMs = opts.budgetMs ?? 4000;
  const transient = opts.isTransient ?? isTransientError;
  const label = opts.label ?? 'retry';

  const t0 = performance.now();
  let prevDelay = baseMs;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn(attempt);
      return { value, attempts: attempt, totalMs: Math.round(performance.now() - t0) };
    } catch (err) {
      lastErr = err;
      const elapsed = performance.now() - t0;

      if (!transient(err) || attempt === maxAttempts) {
        throw err;
      }

      // Compute next sleep, but never overshoot the budget.
      const remainingBudget = budgetMs - elapsed;
      if (remainingBudget <= baseMs) {
        console.warn(`[${label}] budget exhausted after ${Math.round(elapsed)}ms (attempt ${attempt}/${maxAttempts})`);
        throw err;
      }

      const delay = Math.min(nextDelayMs(prevDelay, baseMs, capMs), remainingBudget);
      prevDelay = delay;

      console.warn(`[${label}] attempt ${attempt} failed (${(err as Error).message ?? err}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Unreachable, but keeps TS happy.
  throw lastErr;
}

/**
 * Variant for Supabase-style `{ data, error }` responses that don't throw.
 * Treats `error` as failure and lets `retryWithBackoff` apply the policy.
 */
export async function retrySupabaseCall<T>(
  call: (attempt: number) => Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
  opts: RetryOptions = {},
): Promise<{ data: T | null; attempts: number; totalMs: number }> {
  const result = await retryWithBackoff(async (attempt) => {
    const { data, error } = await call(attempt);
    if (error) {
      const e = new Error(error.message);
      (e as any).code = error.code;
      throw e;
    }
    return data;
  }, opts);
  return { data: result.value, attempts: result.attempts, totalMs: result.totalMs };
}

```

### `supabase/functions/_shared/zod-validate.ts`

```typescript
/**
 * Shared Zod validation utilities for edge functions.
 * Provides type-safe request body parsing with clear error messages.
 */

// Using Zod from esm.sh for Deno compatibility
export { z } from "https://esm.sh/zod@3.23.8";
import { z } from "https://esm.sh/zod@3.23.8";

/**
 * Parse and validate a request body against a Zod schema.
 * Returns parsed data on success, or a 400 Response on failure.
 */
export async function parseBodyWithSchema<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let rawBody: unknown;
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return {
        error: new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }
    rawBody = JSON.parse(text);
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const formErrors = result.error.flatten().formErrors;
    return {
      error: new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: Object.keys(fieldErrors).length > 0 ? fieldErrors : formErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { data: result.data };
}

// ========== Common reusable schemas ==========

/** UUID v4 string */
export const uuidSchema = z.string().uuid();

/** Non-empty trimmed string */
export const nonEmptyString = z.string().trim().min(1, 'Cannot be empty');

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative number (for prices, quantities) */
export const nonNegativeNumber = z.number().nonnegative();

/** Email */
export const emailSchema = z.string().email().max(255);

/** Token (hex string, 64 chars) */
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid token format');

/** Base64 or URL image */
export const imageInputSchema = z.string().min(10).max(10_000_000);

/** Pagination */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(50),
}).partial();

```

---

## 📋 Próximos lotes

Restantes: **82 funções**. Sugestão de agrupamento por domínio:

- **Lote 2** — Quote/Orçamento: `quote-public-view`, `quote-followup-reminders`, `kit-public-view`, `kit-ai-builder`, `kit-identity-suggest`
- **Lote 3** — MCP/Segurança: `mcp-server`, `mcp-keys-issue`, `mcp-keys-rotate`, `mcp-keys-revoke`, `mcp-keys-update`
- **Lote 4** — Auth/RBAC: `authorize` helpers, `step-up-verify`, `force-global-logout`, `detect-new-device`, `log-login-attempt`
- **Lote 5** — Webhooks/Connections: `webhook-dispatcher`, `webhook-inbound`, `product-webhook`, `connection-tester`, `secrets-manager`
- **Lote 6** — IA/Magic Up: `generate-ad-image`, `generate-ad-prompt`, `generate-mockup`, `magic-up-score`, `comparison-ai-advisor`
- **Lote 7** — Públicas (share/react): `favorites-public-react`, `collections-public-react`, `comparisons-public-react`, `favorites-watcher`, `collections-watcher`
- ... (continua)

Peça "manda lote N" quando quiser o próximo.
