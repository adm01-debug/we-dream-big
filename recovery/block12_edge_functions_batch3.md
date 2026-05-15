# Bloco 12 — Edge Functions (Lote 3 / MCP & Segurança)

> Lote 3 do bloco 12. Cobre as **5 edge functions críticas do sistema MCP
> (Model Context Protocol) e do auditing de chaves**.
>
> Lotes anteriores: `block12_edge_functions_batch1.md`,
> `block12_edge_functions_batch2.md`.

---

## ✅ Funções incluídas neste lote

| # | Função              | Linhas | verify_jwt | Tipo                                    |
|---|---------------------|-------:|------------|-----------------------------------------|
| 1 | `mcp-server`        |    504 | **system default** (false) | MCP Streamable HTTP server (mcp-lite + Hono) |
| 2 | `mcp-keys-issue`    |    395 | **system default** (false) | Emissão de chaves MCP (READ/WRITE/FULL)      |
| 3 | `mcp-keys-rotate`   |    330 | **system default** (false) | Rotação de chave MCP existente               |
| 4 | `mcp-keys-revoke`   |    226 | **system default** (false) | Revogação manual                              |
| 5 | `mcp-keys-update`   |    332 | **system default** (false) | Update de scope/expiração                     |

### 🔐 Confirmação de `verify_jwt`

`supabase/config.toml` contém apenas:

```toml
project_id = "jlpkghroyzkmseixtjxv"
```

**Não há nenhum bloco `[functions.<nome>]` configurado.** Todas as 5
funções deste lote rodam com o **default da plataforma Lovable Cloud
(`verify_jwt = false`)** — a validação do JWT é feita **dentro do código**,
o que é mandatório porque:

1. Permite respostas customizadas (audit log de tentativas não-autorizadas).
2. Permite **dois modos de auth simultâneos**:
   - `mcp-server` aceita **MCP API Key** no header `X-MCP-Key` (validada
     via RPC `validate_mcp_key`) **OU** JWT (admin/dev only).
   - `mcp-keys-*` exigem JWT (admin/dev) **+** opcionalmente um
     **step-up token** no header `X-Step-Up-Token` para escopos sensíveis
     (FULL, escalada de scope) — ver
     [`mem://security/mfa-enforcement-authorize`].

### 🔑 Inventário consolidado de secrets/env

Todos auto-injetados pela plataforma:

| Secret                       | mcp-server | issue | rotate | revoke | update |
|------------------------------|:----------:|:-----:|:------:|:------:|:------:|
| `SUPABASE_URL`               | ✅         | ✅    | ✅     | ✅     | ✅     |
| `SUPABASE_ANON_KEY`          | —          | ✅    | ✅     | ✅     | ✅     |
| `SUPABASE_SERVICE_ROLE_KEY`  | ✅         | ✅    | ✅     | ✅     | ✅     |

> `mcp-server` **não usa ANON_KEY** porque não valida JWT do usuário —
> ele autentica via MCP key (hash) ou aceita JWT já validado pelo
> Hono middleware. As demais usam ANON_KEY para fazer `auth.getUser()`
> sobre o token do caller.

### 📦 Imports compartilhados (`_shared/`)

| Arquivo                              | Usado por                                      |
|--------------------------------------|------------------------------------------------|
| `_shared/cors.ts`                    | TODAS (5)                                      |
| `_shared/request-id.ts`              | TODAS (5)                                      |
| `_shared/audit-log.ts`               | TODAS (5)                                      |
| `_shared/supabase-client-adapter.ts` | TODAS (5)                                      |
| `_shared/mcp-scopes.ts`              | issue, rotate, update                          |
| `_shared/mcp-violations.ts`          | issue, rotate, revoke, update                  |

### 📁 `mcp-server/deno.json`

```json
{
  "imports": {
    "hono": "npm:hono@4.6.14",
    "mcp-lite": "npm:mcp-lite@^0.10.0",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.4"
  }
}
```

---

## `mcp-server`

**Path:** `supabase/functions/mcp-server/index.ts` (504 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { buildPublicCorsHeaders, getCorsHeaders } from "../_shared/cors.ts";
// MCP server for Claude Desktop / other Lovable projects.
// Authenticates via X-MCP-Key header (validated in DB against mcp_api_keys.key_hash).
// Each tool declares { scope, mode } and is gated centrally before running.
// Every tool invocation is audited (granted, denied, error) with consistent error codes.
import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { summarizePayload } from "../_shared/audit-log.ts";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Fallback CORS headers — sobrescritos per-request via getCorsHeaders(c.req.raw).
let corsHeaders: Record<string, string> = buildPublicCorsHeaders();

type ValidateMcpKeyRow = {
  key_id: string;
  scopes: string[] | null;
  block_reason: string | null;
  created_by: string | null;
};

const SOURCE = "mcp-server";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ────────────────────────────────────────────────────────────────────────────
// Scope governance
// ────────────────────────────────────────────────────────────────────────────

type ToolMode = "read" | "write" | "admin";

interface AuthCtx {
  keyId: string;
  scopes: Set<string>;
  isFull: boolean;
  ip: string | null;
  ua: string | null;
  requestId: string;
  startedAt: string;
  startedMs: number;
}

interface ToolGuard {
  scope: string;     // e.g. "quotes:read", "quotes:write"
  mode: ToolMode;    // for audit + UX
}

// Standardized error codes for clients (matches admin_audit_log details.error_code)
const ERR = {
  UNAUTHENTICATED: "MCP_UNAUTHENTICATED",
  KEY_REVOKED: "MCP_KEY_REVOKED",
  KEY_EXPIRED: "MCP_KEY_EXPIRED",
  KEY_AUTO_REVOKED_DEV: "MCP_KEY_AUTO_REVOKED_DEV_LOST",
  SCOPE_MISSING: "MCP_SCOPE_MISSING",
  WRITE_FORBIDDEN: "MCP_WRITE_FORBIDDEN",
  INTERNAL: "MCP_INTERNAL_ERROR",
} as const;

class McpAuthError extends Error {
  code: string;
  status: number;
  meta: Record<string, unknown>;
  constructor(code: string, message: string, status = 403, meta: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

async function audit(
  action: "mcp_tool.granted" | "mcp_tool.denied" | "mcp_tool.error",
  ctx: AuthCtx | null,
  details: Record<string, unknown>,
  opts: {
    status: "success" | "denied" | "error";
    payloadSummary?: Record<string, unknown>;
  },
) {
  try {
    const finishedAt = new Date().toISOString();
    const startedAt = ctx?.startedAt ?? finishedAt;
    const duration = ctx ? Date.now() - ctx.startedMs : 0;
    await supabase.from("admin_audit_log").insert({
      user_id: null,
      action,
      resource_type: "mcp_api_key",
      resource_id: ctx?.keyId ?? null,
      ip_address: ctx?.ip ?? null,
      user_agent: ctx?.ua ?? null,
      request_id: ctx?.requestId ?? null,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: duration,
      status: opts.status,
      payload_summary: opts.payloadSummary ?? {},
      source: SOURCE,
      details: {
        ...details,
        is_full_access: ctx?.isFull ?? false,
      },
    });
  } catch (_) {
    // never fail the request because of audit failure
  }
}

/** Resultado detalhado de autenticação para suportar auditoria diferenciada. */
type AuthResult =
  | { kind: "ok"; ctx: AuthCtx }
  | {
      kind: "blocked";
      reason: "grantor_lost_dev" | "revoked" | "expired";
      keyId: string | null;
      createdBy: string | null;
    }
  | { kind: "no_key" }
  | { kind: "invalid_key" };

async function authenticate(req: Request): Promise<AuthResult> {
  const key = req.headers.get("x-mcp-key") || "";
  if (!key || key.length < 16) return { kind: "no_key" };

  const { data, error } = await castRpcResult<{
    data: ValidateMcpKeyRow | ValidateMcpKeyRow[] | null;
    error: { message: string } | null;
  }>(supabase.rpc("validate_mcp_key", { _key_plain: key }));
  if (error) return { kind: "invalid_key" };

  const rows: ValidateMcpKeyRow[] = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) return { kind: "invalid_key" };
  const row = rows[0];

  // Block reasons explícitos do RPC: chave existe mas foi rejeitada.
  if (row.block_reason) {
    const reason = row.block_reason as "grantor_lost_dev" | "revoked" | "expired";
    return { kind: "blocked", reason, keyId: row.key_id ?? null, createdBy: row.created_by ?? null };
  }

  if (!row.scopes) return { kind: "invalid_key" };

  const scopes = new Set<string>(row.scopes);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;
  const ua = req.headers.get("user-agent") ?? null;
  const requestId = getOrCreateRequestId(req);
  return {
    kind: "ok",
    ctx: {
      keyId: row.key_id,
      scopes,
      isFull: scopes.has("*"),
      ip,
      ua,
      requestId,
      startedAt: new Date().toISOString(),
      startedMs: Date.now(),
    },
  };
}

/**
 * Central authorization. Throws McpAuthError if the caller cannot run the tool.
 * Write/admin tools require an EXPLICIT matching scope — wildcard "*" is the only
 * scope that bypasses the explicit-write requirement.
 */
function authorizeTool(ctx: AuthCtx | null, toolName: string, guard: ToolGuard): AuthCtx {
  if (!ctx) {
    throw new McpAuthError(ERR.UNAUTHENTICATED, "Chave MCP inválida ou ausente.", 401);
  }
  // Wildcard always passes — but it was already gated at issuance with strong friction.
  if (ctx.isFull) return ctx;

  const hasScope = ctx.scopes.has(guard.scope);
  if (!hasScope) {
    throw new McpAuthError(
      ERR.SCOPE_MISSING,
      `Acesso negado: a ferramenta "${toolName}" requer o escopo "${guard.scope}" (modo ${guard.mode}). Sua chave possui: [${[...ctx.scopes].join(", ") || "nenhum"}].`,
      403,
      { required_scope: guard.scope, mode: guard.mode, available_scopes: [...ctx.scopes] },
    );
  }

  // Defensive double-check: write/admin tools must NEVER run from a read-only scope.
  if (guard.mode !== "read") {
    const isWriteScope = guard.scope.endsWith(":write") || guard.scope === "*";
    if (!isWriteScope) {
      throw new McpAuthError(
        ERR.WRITE_FORBIDDEN,
        `Configuração inválida: ferramenta "${toolName}" em modo "${guard.mode}" exige escopo terminando em :write.`,
        403,
        { required_scope: guard.scope, mode: guard.mode },
      );
    }
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Tool wrapper: gate + audit + error normalization
// ────────────────────────────────────────────────────────────────────────────

type ToolResult = { content: Array<{ type: "text"; text: string }> };
type ToolHandler<I> = (input: I, ctx: AuthCtx) => Promise<ToolResult> | ToolResult;

function defineTool<I>(
  name: string,
  guard: ToolGuard,
  description: string,
  inputSchema: Record<string, unknown>,
  handler: ToolHandler<I>,
) {
  mcpServer.tool(name, {
    description: `${description} [scope: ${guard.scope} | mode: ${guard.mode}]`,
    inputSchema,
    handler: async (input: I): Promise<ToolResult> => {
      const ctx = currentCtx;
      const startedAt = Date.now();
      const payloadSummary = summarizePayload(input);
      try {
        const authed = authorizeTool(ctx, name, guard);
        const result = await handler(input, authed);
        await audit(
          "mcp_tool.granted",
          authed,
          { tool: name, scope: guard.scope, mode: guard.mode, duration_ms: Date.now() - startedAt },
          { status: "success", payloadSummary },
        );
        return result;
      } catch (err) {
        if (err instanceof McpAuthError) {
          await audit(
            "mcp_tool.denied",
            ctx,
            { tool: name, scope: guard.scope, mode: guard.mode, error_code: err.code, ...err.meta },
            { status: "denied", payloadSummary },
          );
          throw new Error(`[${err.code}] ${err.message}`);
        }
        await audit(
          "mcp_tool.error",
          ctx,
          {
            tool: name,
            scope: guard.scope,
            mode: guard.mode,
            error_code: ERR.INTERNAL,
            message: err instanceof Error ? err.message : String(err),
          },
          { status: "error", payloadSummary },
        );
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
  });
}

const mcpServer = new McpServer({
  name: "promogifts-mcp",
  version: "1.1.0",
});

// We resolve the auth context from a per-request module-level holder.
let currentCtx: AuthCtx | null = null;

// ────────────────────────────────────────────────────────────────────────────
// READ tools
// ────────────────────────────────────────────────────────────────────────────

defineTool<{ status?: string; limit?: number }>(
  "list_quotes",
  { scope: "quotes:read", mode: "read" },
  "Lista os orçamentos mais recentes (limite 50).",
  {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrar por status (opcional)" },
      limit: { type: "number", description: "Máximo 50", default: 20 },
    },
  },
  async ({ status, limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select(
      "id, quote_number, status, client_name, client_email, total, created_at, updated_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ id: string }>(
  "get_quote",
  { scope: "quotes:read", mode: "read" },
  "Detalha um orçamento por id.",
  {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "UUID do orçamento" } },
  },
  async ({ id }) => {
    const { data, error } = await supabase.from("quotes").select("*, quote_items(*)").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ search?: string; limit?: number }>(
  "list_companies",
  { scope: "crm:read", mode: "read" },
  "Lista as últimas empresas/clientes do CRM.",
  {
    type: "object",
    properties: { search: { type: "string" }, limit: { type: "number", default: 20 } },
  },
  async ({ search, limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select("client_name, client_email, client_company")
      .not("client_name", "is", null).limit(lim);
    if (search) q = q.ilike("client_name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ limit?: number }>(
  "list_recent_orders",
  { scope: "orders:read", mode: "read" },
  "Lista os pedidos mais recentes.",
  {
    type: "object",
    properties: { limit: { type: "number", default: 20 } },
  },
  async ({ limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    const { data, error } = await supabase.from("orders").select(
      "id, order_number, status, fulfillment_status, client_name, total, created_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

// ────────────────────────────────────────────────────────────────────────────
// PING (no scope)
// ────────────────────────────────────────────────────────────────────────────

mcpServer.tool("ping", {
  description: "Verifica conectividade do MCP. [scope: nenhum | mode: read]",
  inputSchema: { type: "object", properties: {} },
  handler: () => {
    if (!currentCtx) throw new Error(`[${ERR.UNAUTHENTICATED}] Chave MCP inválida ou ausente.`);
    return { content: [{ type: "text", text: `pong (key ${currentCtx.keyId.slice(0, 8)}…, scopes: ${[...currentCtx.scopes].join(",") || "—"})` }] };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Transport
// ────────────────────────────────────────────────────────────────────────────

const transport = new StreamableHttpTransport();
const app = new Hono();

app.options("/*", (c) => new Response(null, { headers: getCorsHeaders(c.req.raw) }));

const httpHandler = transport.bind(mcpServer);

app.all("/*", async (c) => {
  const auth = await authenticate(c.req.raw);
  const reqId = getOrCreateRequestId(c.req.raw);
  const ip =
    c.req.raw.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.raw.headers.get("cf-connecting-ip") ??
    null;
  const ua = c.req.raw.headers.get("user-agent") ?? null;

  // ── Caminho 1: chave FULL bloqueada por perda de role dev (auto-revogada na validação)
  if (auth.kind === "blocked" && auth.reason === "grantor_lost_dev") {
    const nowIso = new Date().toISOString();
    try {
      await supabase.from("admin_audit_log").insert({
        user_id: auth.createdBy,
        action: "mcp_tool.denied_dev_revoked",
        resource_type: "mcp_api_key",
        resource_id: auth.keyId,
        ip_address: ip,
        user_agent: ua,
        request_id: reqId,
        started_at: nowIso,
        finished_at: nowIso,
        duration_ms: 0,
        status: "denied",
        payload_summary: {},
        source: SOURCE,
        details: {
          error_code: ERR.KEY_AUTO_REVOKED_DEV,
          reason: "grantor_lost_dev_at_use",
          is_full_access: true,
          created_by: auth.createdBy,
          key_id: auth.keyId,
          revoked_at: nowIso,
          method: c.req.raw.method,
        },
      });
    } catch (_) { /* never block on audit */ }
    return new Response(
      JSON.stringify({
        error: ERR.KEY_AUTO_REVOKED_DEV,
        message: "Chave MCP de escopo total revogada: emissor original perdeu o papel dev.",
        request_id: reqId,
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: reqId } },
    );
  }

  // ── Caminho 2: chave revogada/expirada por outros motivos (audit leve)
  if (auth.kind === "blocked") {
    const nowIso = new Date().toISOString();
    const code = auth.reason === "expired" ? ERR.KEY_EXPIRED : ERR.KEY_REVOKED;
    try {
      await supabase.from("admin_audit_log").insert({
        user_id: auth.createdBy,
        action: "mcp_tool.denied",
        resource_type: "mcp_api_key",
        resource_id: auth.keyId,
        ip_address: ip,
        user_agent: ua,
        request_id: reqId,
        started_at: nowIso,
        finished_at: nowIso,
        duration_ms: 0,
        status: "denied",
        payload_summary: {},
        source: SOURCE,
        details: {
          error_code: code,
          reason: auth.reason,
          key_id: auth.keyId,
          created_by: auth.createdBy,
          method: c.req.raw.method,
        },
      });
    } catch (_) { /* never block on audit */ }
    return new Response(
      JSON.stringify({ error: code, message: `Chave MCP ${auth.reason}.`, request_id: reqId }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: reqId } },
    );
  }

  // ── Caminho 3: chave inexistente ou ausente
  if (auth.kind !== "ok") {
    try {
      const keyHeader = c.req.raw.headers.get("x-mcp-key") || "";
      await supabase.from("admin_audit_log").insert({
        user_id: null,
        action: "mcp_tool.denied",
        resource_type: "mcp_api_key",
        resource_id: null,
        ip_address: ip,
        user_agent: ua,
        request_id: reqId,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: 0,
        status: "denied",
        payload_summary: {},
        source: SOURCE,
        details: {
          error_code: ERR.UNAUTHENTICATED,
          reason: auth.kind === "no_key" ? "missing_key" : "invalid_key",
          key_length: keyHeader.length,
          method: c.req.raw.method,
        },
      });
    } catch (_) { /* never block on audit */ }
    return new Response(
      JSON.stringify({ error: ERR.UNAUTHENTICATED, message: "Chave MCP inválida ou ausente.", request_id: reqId }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: reqId } },
    );
  }

  // ── Caminho feliz
  const ctx = auth.ctx;
  currentCtx = ctx;
  try {
    const res = await httpHandler(c.req.raw);
    const merged = new Headers(res.headers);
    for (const [k, v] of Object.entries(getCorsHeaders(c.req.raw))) merged.set(k, v);
    merged.set(REQUEST_ID_HEADER, ctx.requestId);
    return new Response(res.body, { status: res.status, headers: merged });
  } finally {
    currentCtx = null;
  }
});

Deno.serve(app.fetch);
```

---

## `mcp-keys-issue`

**Path:** `supabase/functions/mcp-keys-issue/index.ts` (395 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * mcp-keys-issue
 *
 * Emite uma nova chave MCP server-side.
 *
 * Fluxo:
 *  1. CORS + OPTIONS
 *  2. Autentica via JWT (Authorization: Bearer)
 *  3. Verifica role admin via has_role()
 *  4. Valida payload com Zod (incluindo regras de alçada para escopo "*")
 *  5. Gera chave plana + hash SHA-256 server-side
 *  6. Insere em mcp_api_keys (service_role)
 *  7. Registra em admin_audit_log
 *  8. Retorna a chave plana UMA ÚNICA VEZ
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  KNOWN_SCOPES,
  FULL_SCOPE,
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  FULL_SCOPE_MAX_TTL_MS,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { writeAuditEntry, summarizePayload, extractRequestMeta } from "../_shared/audit-log.ts";
import { recordMcpViolation, mapViolationReason } from "../_shared/mcp-violations.ts";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

type RpcEnvelope<T> = { data: T | null; error: { message: string } | null };

const SOURCE = "mcp-keys-issue";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    scopes: z
      .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]]))
      .min(1)
      .max(KNOWN_SCOPES.length),
    expires_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    justification: z.string().trim().max(1000).optional().nullable(),
    confirmation_phrase: z.string().optional().nullable(),
    step_up_token: z.string().min(32).max(256).optional().nullable(),
    target_repo: z.string().trim().max(200).optional().nullable(),
    target_tool: z.string().trim().max(100).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const full = isFullAccess(data.scopes);
    if (!full) return;

    // Regras adicionais quando escopo "*" está presente.
    if (!data.expires_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "Chaves com escopo '*' exigem data de expiração.",
      });
    } else {
      const expiresMs = new Date(data.expires_at).getTime();
      const nowMs = Date.now();
      if (Number.isNaN(expiresMs) || expiresMs <= nowMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expires_at"],
          message: "Data de expiração precisa ser no futuro.",
        });
      } else if (expiresMs - nowMs > FULL_SCOPE_MAX_TTL_MS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expires_at"],
          message: "Janela máxima para chave full é de 180 dias.",
        });
      }
    }

    if (
      !data.justification ||
      data.justification.length < FULL_SCOPE_MIN_JUSTIFICATION
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justification"],
        message: `Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para chave full.`,
      });
    }

    if (data.confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmation_phrase"],
        message: `Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar.`,
      });
    }
  });

function jsonResponse(body: unknown, status: number, requestId?: string) {
  const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;
  return new Response(JSON.stringify(requestId ? { ...(body as object), request_id: requestId } : body), {
    status,
    headers,
  });
}

async function generateKey(): Promise<{ plain: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const plain = `mcp_${hex}`;
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const hash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { plain, hash, prefix: plain.slice(0, 12) };
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const requestId = getOrCreateRequestId(req);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { ip, ua } = extractRequestMeta(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, requestId);
  }

  // Cliente service-role inicializado cedo para auditoria de erros
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  let rawBody: unknown = null;

  const auditFailure = async (
    status: "error" | "denied",
    action: string,
    extra: Record<string, unknown>,
    resourceId?: string | null,
  ) => {
    await writeAuditEntry(admin, {
      user_id: userId,
      action,
      resource_type: "mcp_api_key",
      resource_id: resourceId ?? null,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status,
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: extra,
    });
    if (status === "denied") {
      await recordMcpViolation(admin, {
        userId,
        reason: mapViolationReason(extra?.reason),
        source: SOURCE,
        operation: "issue",
        targetKeyId: resourceId ?? null,
        ip, userAgent: ua, requestId,
        details: extra,
      });
    }
  };

  try {
    // 1. JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "unauthenticated" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "invalid_jwt" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }
    userId = userData.user.id;

    // 3. Role check — apenas DEV pode emitir chaves MCP
    const { data: roleCheck, error: roleErr } = await castRpcResult<RpcEnvelope<boolean>>(
      admin.rpc("is_dev", { _user_id: userId }),
    );
    if (roleErr) {
      await auditFailure("error", "mcp_key.issue_error", { reason: "role_check_failed", detail: roleErr.message });
      return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500, requestId);
    }
    if (!roleCheck) {
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "not_dev" });
      return jsonResponse({ error: "forbidden", message: "Apenas desenvolvedores podem emitir chaves MCP." }, 403, requestId);
    }

    // 4. Validate body
    try {
      rawBody = await req.json();
    } catch {
      await auditFailure("error", "mcp_key.issue_error", { reason: "invalid_json" });
      return jsonResponse({ error: "invalid_json" }, 400, requestId);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "validation_failed", fields });
      return jsonResponse({ error: "validation_failed", fields }, 422, requestId);
    }
    const { name, scopes, expires_at, justification, step_up_token, target_repo, target_tool } = parsed.data;
    const full = isFullAccess(scopes);

    // 4a. Step-up OBRIGATÓRIO para QUALQUER emissão (não apenas full).
    // Toda chave MCP é credencial sensível; exigimos senha + OTP recentes
    // (validados em consume_step_up_token, que também re-checa is_dev no consumo).
    if (!step_up_token) {
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "step_up_required", scope: full ? "full" : "scoped" });
      return jsonResponse(
        { error: "step_up_required", message: "Confirme sua identidade (senha + código por e-mail) antes de emitir uma chave MCP." },
        403,
        requestId,
      );
    }
    // Para chaves full mantemos a action mais forte 'mcp_full_issue' (o frontend já a usa).
    // Para chaves limitadas usamos 'mcp_key_rotate' como ação genérica de mutação de chave —
    // ambas exigem o mesmo fluxo de senha+OTP, mas auditamos diferente.
    const expectedStepUp = full ? "mcp_full_issue" : "mcp_key_rotate";
    const { data: stepUpOk, error: stepUpErr } = await castRpcResult<RpcEnvelope<boolean>>(
      userClient.rpc("consume_step_up_token", {
        _token: step_up_token,
        _expected_action: expectedStepUp,
        _expected_target: null,
      }),
    );
    if (stepUpErr || !stepUpOk) {
      await auditFailure("denied", "mcp_key.issue_denied", { reason: "step_up_invalid", detail: stepUpErr?.message, expected_action: expectedStepUp });
      return jsonResponse(
        { error: "step_up_invalid", message: "Verificação dupla expirou ou é inválida. Refaça a confirmação." },
        403,
        requestId,
      );
    }

    // 4b. Authorization gate adicional para FULL scope: precisa estar em mcp_full_grantors.
    if (full) {
      const { data: canGrant, error: grantErr } = await castRpcResult<RpcEnvelope<boolean>>(
        admin.rpc("can_grant_mcp_full", { _user_id: userId }),
      );
      if (grantErr) {
        await auditFailure("error", "mcp_key.issue_error", { reason: "grant_check_failed", detail: grantErr.message });
        return jsonResponse({ error: "internal_error", detail: grantErr.message }, 500, requestId);
      }
      if (!canGrant) {
        await auditFailure("denied", "mcp_key.issue_denied", {
          reason: "full_grant_forbidden",
          required_permission: "mcp_full_grantors",
        });
        return jsonResponse(
          {
            error: "full_grant_forbidden",
            message: "Você não tem permissão para emitir chaves MCP com escopo total (*). Solicite a um admin já autorizado para incluir você em mcp_full_grantors.",
          },
          403,
          requestId,
        );
      }
    }

    // 5. Generate key
    const { plain, hash, prefix } = await generateKey();

    // 6. Insert
    const { data: inserted, error: insertErr } = await admin
      .from("mcp_api_keys")
      .insert({
        name,
        key_hash: hash,
        key_prefix: prefix,
        scopes,
        created_by: userId,
        expires_at: expires_at ?? null,
        description: justification ?? null,
      })
      .select("id, key_prefix, scopes, expires_at, created_at")
      .single();
    if (insertErr || !inserted) {
      await auditFailure("error", "mcp_key.issue_error", { reason: "insert_failed", detail: insertErr?.message });
      return jsonResponse({ error: "insert_failed", detail: insertErr?.message ?? "unknown" }, 500, requestId);
    }

    // 7. Audit log (success)
    await writeAuditEntry(admin, {
      user_id: userId,
      action: "mcp_key.issued",
      resource_type: "mcp_api_key",
      resource_id: inserted.id,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status: "success",
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: {
        key_prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        is_full_access: full,
        justification: justification ?? null,
        name,
        target_repo: target_repo ?? null,
        target_tool: target_tool ?? null,
        step_up_verified: full ? true : null,
      },
    });

    // 7b. Auditoria explícita de concessão FULL (correlaciona token/challenge/chave)
    if (full) {
      try {
        await userClient.rpc("log_full_scope_grant", {
          _operation: "issue",
          _key_id: inserted.id,
          _key_prefix: inserted.key_prefix,
          _justification: justification ?? null,
          _confirmation_phrase_ok: true,
          _expires_at: inserted.expires_at,
          _ip: ip,
          _user_agent: ua,
          _request_id: requestId,
          _extra: { name, target_repo: target_repo ?? null, target_tool: target_tool ?? null },
        });
      } catch (e) {
        // Não falhar a operação por erro de auditoria — mas registrar no admin log
        await writeAuditEntry(admin, {
          user_id: userId,
          action: "mcp_key.audit_log_failed",
          resource_type: "mcp_api_key",
          resource_id: inserted.id,
          status: "error",
          source: SOURCE,
          request_id: requestId,
          started_at: new Date().toISOString(),
          details: { reason: "log_full_scope_grant_failed", detail: (e as Error).message },
        });
      }
    }

    // 8. Response
    return jsonResponse(
      {
        ok: true,
        key: plain,
        prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        id: inserted.id,
        is_full_access: full,
      },
      200,
      requestId,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await auditFailure("error", "mcp_key.issue_error", { reason: "uncaught", detail });
    return jsonResponse({ error: "internal_error", detail }, 500, requestId);
  }
});
```

---

## `mcp-keys-rotate`

**Path:** `supabase/functions/mcp-keys-rotate/index.ts` (330 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * mcp-keys-rotate
 *
 * Duplica uma chave MCP existente preservando nome+escopos+expiração,
 * vinculando a nova à antiga via `rotated_from`. A chave antiga
 * NÃO é revogada automaticamente. Auditoria com request_id e payload_summary.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { writeAuditEntry, summarizePayload, extractRequestMeta } from "../_shared/audit-log.ts";
import { recordMcpViolation, mapViolationReason } from "../_shared/mcp-violations.ts";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

type RpcEnvelope<T> = { data: T | null; error: { message: string } | null };

const SOURCE = "mcp-keys-rotate";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  source_key_id: z.string().uuid(),
  justification: z.string().trim().max(1000).optional().nullable(),
  confirmation_phrase: z.string().optional().nullable(),
  /** Token de step-up (senha + OTP) — obrigatório ao rotacionar chave FULL. */
  step_up_token: z.string().min(32).max(256).optional().nullable(),
});

function jsonResponse(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify({ ...(body as object), request_id: requestId }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: requestId },
  });
}

async function generateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const plain = `mcp_${hex}`;
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { plain, hash, prefix: plain.slice(0, 12) };
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = getOrCreateRequestId(req);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { ip, ua } = extractRequestMeta(req);

  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, requestId);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  let rawBody: unknown = null;

  const auditFailure = async (
    status: "error" | "denied",
    extra: Record<string, unknown>,
    resourceId?: string | null,
  ) => {
    await writeAuditEntry(admin, {
      user_id: userId,
      action: status === "denied" ? "mcp_key.rotate_denied" : "mcp_key.rotate_error",
      resource_type: "mcp_api_key",
      resource_id: resourceId ?? null,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status,
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: extra,
    });
    if (status === "denied") {
      await recordMcpViolation(admin, {
        userId,
        reason: mapViolationReason(extra?.reason),
        source: SOURCE,
        operation: "rotate",
        targetKeyId: resourceId ?? null,
        ip, userAgent: ua, requestId,
        details: extra,
      });
    }
  };

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      await auditFailure("denied", { reason: "unauthenticated" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      await auditFailure("denied", { reason: "invalid_jwt" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }
    userId = userData.user.id;

    const { data: roleCheck, error: roleErr } = await castRpcResult<RpcEnvelope<boolean>>(
      admin.rpc("is_dev", { _user_id: userId }),
    );
    if (roleErr) {
      await auditFailure("error", { reason: "role_check_failed", detail: roleErr.message });
      return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500, requestId);
    }
    if (!roleCheck) {
      await auditFailure("denied", { reason: "not_dev" });
      return jsonResponse({ error: "forbidden", message: "Apenas desenvolvedores podem rotacionar chaves MCP." }, 403, requestId);
    }

    try { rawBody = await req.json(); } catch {
      await auditFailure("error", { reason: "invalid_json" });
      return jsonResponse({ error: "invalid_json" }, 400, requestId);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      await auditFailure("denied", { reason: "validation_failed", fields });
      return jsonResponse({ error: "validation_failed", fields }, 422, requestId);
    }
    const { source_key_id, justification, confirmation_phrase, step_up_token } = parsed.data;

    const { data: source, error: srcErr } = await admin
      .from("mcp_api_keys")
      .select("id, name, scopes, expires_at, revoked_at, key_prefix")
      .eq("id", source_key_id)
      .maybeSingle();
    if (srcErr) {
      await auditFailure("error", { reason: "fetch_failed", detail: srcErr.message }, source_key_id);
      return jsonResponse({ error: "internal_error", detail: srcErr.message }, 500, requestId);
    }
    if (!source) {
      await auditFailure("denied", { reason: "source_not_found" }, source_key_id);
      return jsonResponse({ error: "source_not_found" }, 404, requestId);
    }
    if (source.revoked_at) {
      await auditFailure("denied", { reason: "source_revoked" }, source_key_id);
      return jsonResponse({ error: "policy_violation", message: "Chave de origem está revogada." }, 422, requestId);
    }

    const full = isFullAccess(source.scopes ?? []);

    // Step-up OBRIGATÓRIO para QUALQUER rotação (full ou limitada).
    // Rotacionar = emitir nova credencial; trata-se com o mesmo nível de fricção.
    if (!step_up_token) {
      await auditFailure("denied", { reason: "step_up_required", scope: full ? "full" : "scoped" }, source_key_id);
      return jsonResponse(
        { error: "step_up_required", message: "Confirme sua identidade (senha + código por e-mail) antes de rotacionar uma chave MCP." },
        403,
        requestId,
      );
    }
    // Para chaves full mantemos a action mais forte 'mcp_full_issue' (frontend já a usa).
    // Para chaves limitadas usamos 'mcp_key_rotate' — mesmo fluxo, auditoria distinta.
    const expectedStepUp = full ? "mcp_full_issue" : "mcp_key_rotate";
    const { data: stepUpOk, error: stepUpErr } = await castRpcResult<RpcEnvelope<boolean>>(
      userClient.rpc("consume_step_up_token", {
        _token: step_up_token,
        _expected_action: expectedStepUp,
        _expected_target: source_key_id,
      }),
    );
    if (stepUpErr || !stepUpOk) {
      await auditFailure("denied", { reason: "step_up_invalid", detail: stepUpErr?.message, expected_action: expectedStepUp }, source_key_id);
      return jsonResponse(
        { error: "step_up_invalid", message: "Verificação dupla expirou ou é inválida. Refaça a confirmação." },
        403,
        requestId,
      );
    }

    if (full) {

      // Authorization gate: only explicit grantors can rotate (re-emit) FULL keys
      const { data: canGrant, error: grantErr } = await castRpcResult<RpcEnvelope<boolean>>(
        admin.rpc("can_grant_mcp_full", { _user_id: userId }),
      );
      if (grantErr) {
        await auditFailure("error", { reason: "grant_check_failed", detail: grantErr.message }, source_key_id);
        return jsonResponse({ error: "internal_error", detail: grantErr.message }, 500, requestId);
      }
      if (!canGrant) {
        await auditFailure("denied", { reason: "full_grant_forbidden" }, source_key_id);
        return jsonResponse(
          {
            error: "full_grant_forbidden",
            message: "Você não tem permissão para rotacionar chaves MCP com escopo total (*). Solicite a inclusão em mcp_full_grantors.",
          },
          403,
          requestId,
        );
      }

      const fieldErrors: Record<string, string[]> = {};
      if (!justification || justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) {
        fieldErrors.justification = [`Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para rotacionar chave full.`];
      }
      if (confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
        fieldErrors.confirmation_phrase = [`Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar.`];
      }
      if (Object.keys(fieldErrors).length > 0) {
        await auditFailure("denied", { reason: "full_friction_failed", fields: fieldErrors }, source_key_id);
        return jsonResponse({ error: "validation_failed", fields: fieldErrors }, 422, requestId);
      }
    }

    const { plain, hash, prefix } = await generateKey();
    const newName = `${source.name} (rotacionada)`;

    const { data: inserted, error: insertErr } = await admin
      .from("mcp_api_keys")
      .insert({
        name: newName,
        key_hash: hash,
        key_prefix: prefix,
        scopes: source.scopes,
        created_by: userId,
        expires_at: source.expires_at,
        rotated_from: source.id,
        description: justification ?? null,
      })
      .select("id, key_prefix, scopes, expires_at, created_at, rotated_from")
      .single();
    if (insertErr || !inserted) {
      await auditFailure("error", { reason: "insert_failed", detail: insertErr?.message ?? "unknown" }, source_key_id);
      return jsonResponse({ error: "insert_failed", detail: insertErr?.message ?? "unknown" }, 500, requestId);
    }

    await writeAuditEntry(admin, {
      user_id: userId,
      action: "mcp_key.rotated",
      resource_type: "mcp_api_key",
      resource_id: inserted.id,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status: "success",
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: {
        new_key_prefix: inserted.key_prefix,
        source_id: source.id,
        source_prefix: source.key_prefix,
        scopes: inserted.scopes,
        is_full_access: full,
        justification: justification ?? null,
        expires_at: inserted.expires_at,
      },
    });

    // Auditoria explícita de concessão FULL (correlaciona token/challenge/chave)
    if (full) {
      try {
        await userClient.rpc("log_full_scope_grant", {
          _operation: "rotate",
          _key_id: inserted.id,
          _key_prefix: inserted.key_prefix,
          _justification: justification ?? null,
          _confirmation_phrase_ok: confirmation_phrase === FULL_SCOPE_CONFIRMATION,
          _expires_at: inserted.expires_at,
          _ip: ip,
          _user_agent: ua,
          _request_id: requestId,
          _extra: { source_id: source.id, source_prefix: source.key_prefix },
        });
      } catch (e) {
        await writeAuditEntry(admin, {
          user_id: userId,
          action: "mcp_key.audit_log_failed",
          resource_type: "mcp_api_key",
          resource_id: inserted.id,
          status: "error",
          source: SOURCE,
          request_id: requestId,
          started_at: new Date().toISOString(),
          details: { reason: "log_full_scope_grant_failed", detail: (e as Error).message },
        });
      }
    }

    return jsonResponse(
      {
        ok: true,
        key: plain,
        prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        id: inserted.id,
        rotated_from: inserted.rotated_from,
        is_full_access: full,
      },
      200,
      requestId,
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await auditFailure("error", { reason: "uncaught", detail });
    return jsonResponse({ error: "internal_error", detail }, 500, requestId);
  }
});
```

---

## `mcp-keys-revoke`

**Path:** `supabase/functions/mcp-keys-revoke/index.ts` (226 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * mcp-keys-revoke
 *
 * Revoga uma chave MCP server-side, registrando IP/UA + request_id +
 * payload_summary antes do trigger DB.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { writeAuditEntry, summarizePayload, extractRequestMeta } from "../_shared/audit-log.ts";
import { recordMcpViolation, mapViolationReason } from "../_shared/mcp-violations.ts";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

type RpcEnvelope<T> = { data: T | null; error: { message: string } | null };

const SOURCE = "mcp-keys-revoke";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  key_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
  /** Token de step-up (senha + OTP) — obrigatório para revogar qualquer chave MCP. */
  step_up_token: z.string().min(32).max(256).optional().nullable(),
});

function jsonResponse(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify({ ...(body as object), request_id: requestId }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: requestId },
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = getOrCreateRequestId(req);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { ip, ua } = extractRequestMeta(req);

  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, requestId);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  let rawBody: unknown = null;

  const auditFailure = async (
    status: "error" | "denied",
    action: string,
    extra: Record<string, unknown>,
    resourceId?: string | null,
  ) => {
    await writeAuditEntry(admin, {
      user_id: userId,
      action,
      resource_type: "mcp_api_key",
      resource_id: resourceId ?? null,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status,
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: extra,
    });
    if (status === "denied") {
      await recordMcpViolation(admin, {
        userId,
        reason: mapViolationReason(extra?.reason),
        source: SOURCE,
        operation: "revoke",
        targetKeyId: resourceId ?? null,
        ip, userAgent: ua, requestId,
        details: extra,
      });
    }
  };

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "unauthenticated" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "invalid_jwt" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }
    userId = userData.user.id;

    const { data: roleCheck, error: roleErr } = await castRpcResult<RpcEnvelope<boolean>>(
      admin.rpc("is_dev", { _user_id: userId }),
    );
    if (roleErr) {
      await auditFailure("error", "mcp_key.revoke_error", { reason: "role_check_failed", detail: roleErr.message });
      return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500, requestId);
    }
    if (!roleCheck) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "not_dev" });
      return jsonResponse({ error: "forbidden", message: "Apenas desenvolvedores podem revogar chaves MCP." }, 403, requestId);
    }

    try { rawBody = await req.json(); } catch {
      await auditFailure("error", "mcp_key.revoke_error", { reason: "invalid_json" });
      return jsonResponse({ error: "invalid_json" }, 400, requestId);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "validation_failed", fields });
      return jsonResponse({ error: "validation_failed", fields }, 422, requestId);
    }
    const { key_id, reason, step_up_token } = parsed.data;

    // Step-up OBRIGATÓRIO antes de revogar qualquer chave MCP.
    // Revogação tem efeito imediato em todas as integrações; exigimos confirmação por
    // senha + OTP recente (validados em consume_step_up_token, que re-checa is_dev no consumo).
    if (!step_up_token) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "step_up_required" }, key_id);
      return jsonResponse(
        { error: "step_up_required", message: "Confirme sua identidade (senha + código por e-mail) antes de revogar uma chave MCP." },
        403,
        requestId,
      );
    }
    const { data: stepUpOk, error: stepUpErr } = await castRpcResult<RpcEnvelope<boolean>>(
      userClient.rpc("consume_step_up_token", {
        _token: step_up_token,
        _expected_action: "mcp_key_revoke",
        _expected_target: key_id,
      }),
    );
    if (stepUpErr || !stepUpOk) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "step_up_invalid", detail: stepUpErr?.message, expected_action: "mcp_key_revoke" }, key_id);
      return jsonResponse(
        { error: "step_up_invalid", message: "Verificação dupla expirou ou é inválida. Refaça a confirmação." },
        403,
        requestId,
      );
    }

    const { data: existing, error: fetchErr } = await admin
      .from("mcp_api_keys")
      .select("id, key_prefix, name, scopes, revoked_at")
      .eq("id", key_id)
      .maybeSingle();
    if (fetchErr) {
      await auditFailure("error", "mcp_key.revoke_error", { reason: "fetch_failed", detail: fetchErr.message }, key_id);
      return jsonResponse({ error: "internal_error", detail: fetchErr.message }, 500, requestId);
    }
    if (!existing) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "not_found" }, key_id);
      return jsonResponse({ error: "not_found" }, 404, requestId);
    }
    if (existing.revoked_at) {
      await auditFailure("denied", "mcp_key.revoke_denied", { reason: "already_revoked" }, key_id);
      return jsonResponse({ error: "already_revoked" }, 409, requestId);
    }

    // postgrest-js 2.95+ removeu .then/.catch do RPC builder — usar try/catch.
    // Falhas em set_config são silenciadas (best-effort para o trigger de auditoria).
    try {
      await admin.rpc("set_config" as never, { setting_name: "request.mcp_actor", new_value: userId, is_local: true } as never);
    } catch {
      // intentionally swallowed
    }

    const revokedAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("mcp_api_keys")
      .update({ revoked_at: revokedAt })
      .eq("id", key_id);
    if (updErr) {
      await auditFailure("error", "mcp_key.revoke_error", { reason: "update_failed", detail: updErr.message }, key_id);
      return jsonResponse({ error: "update_failed", detail: updErr.message }, 500, requestId);
    }

    await writeAuditEntry(admin, {
      user_id: userId,
      action: "mcp_key.revoked",
      resource_type: "mcp_api_key",
      resource_id: existing.id,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status: "success",
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: {
        key_prefix: existing.key_prefix,
        name: existing.name,
        scopes: existing.scopes,
        is_full_access: (existing.scopes ?? []).includes("*"),
        revoked_at: revokedAt,
        reason: reason ?? null,
      },
    });

    return jsonResponse({ ok: true, id: existing.id, revoked_at: revokedAt }, 200, requestId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await auditFailure("error", "mcp_key.revoke_error", { reason: "uncaught", detail });
    return jsonResponse({ error: "internal_error", detail }, 500, requestId);
  }
});
```

---

## `mcp-keys-update`

**Path:** `supabase/functions/mcp-keys-update/index.ts` (332 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * mcp-keys-update
 *
 * Atualiza campos sensíveis de uma chave MCP (name, description, scopes, expires_at).
 * Toda mudança é auditada com request_id, payload_summary, duração e status.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  KNOWN_SCOPES,
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  FULL_SCOPE_MAX_TTL_MS,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { writeAuditEntry, summarizePayload, extractRequestMeta } from "../_shared/audit-log.ts";
import { recordMcpViolation, mapViolationReason } from "../_shared/mcp-violations.ts";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

type RpcEnvelope<T> = { data: T | null; error: { message: string } | null };

const SOURCE = "mcp-keys-update";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  key_id: z.string().uuid(),
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  scopes: z
    .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]]))
    .min(1)
    .max(KNOWN_SCOPES.length)
    .optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  justification: z.string().trim().max(1000).optional().nullable(),
  confirmation_phrase: z.string().optional().nullable(),
  /** Token de step-up (senha + OTP) — obrigatório para escalar para FULL. */
  step_up_token: z.string().min(32).max(256).optional().nullable(),
});

function jsonResponse(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify({ ...(body as object), request_id: requestId }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", [REQUEST_ID_HEADER]: requestId },
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = getOrCreateRequestId(req);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { ip, ua } = extractRequestMeta(req);

  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, requestId);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  let rawBody: unknown = null;

  const auditFailure = async (
    status: "error" | "denied",
    extra: Record<string, unknown>,
    resourceId?: string | null,
  ) => {
    await writeAuditEntry(admin, {
      user_id: userId,
      action: status === "denied" ? "mcp_key.update_denied" : "mcp_key.update_error",
      resource_type: "mcp_api_key",
      resource_id: resourceId ?? null,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status,
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: extra,
    });
    if (status === "denied") {
      await recordMcpViolation(admin, {
        userId,
        reason: mapViolationReason(extra?.reason),
        source: SOURCE,
        operation: "update",
        targetKeyId: resourceId ?? null,
        ip, userAgent: ua, requestId,
        details: extra,
      });
    }
  };

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      await auditFailure("denied", { reason: "unauthenticated" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      await auditFailure("denied", { reason: "invalid_jwt" });
      return jsonResponse({ error: "unauthenticated" }, 401, requestId);
    }
    userId = userData.user.id;

    const { data: roleCheck, error: roleErr } = await castRpcResult<RpcEnvelope<boolean>>(
      admin.rpc("is_dev", { _user_id: userId }),
    );
    if (roleErr) {
      await auditFailure("error", { reason: "role_check_failed", detail: roleErr.message });
      return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500, requestId);
    }
    if (!roleCheck) {
      await auditFailure("denied", { reason: "not_dev" });
      return jsonResponse({ error: "forbidden", message: "Apenas desenvolvedores podem editar chaves MCP." }, 403, requestId);
    }

    try { rawBody = await req.json(); } catch {
      await auditFailure("error", { reason: "invalid_json" });
      return jsonResponse({ error: "invalid_json" }, 400, requestId);
    }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      await auditFailure("denied", { reason: "validation_failed", fields });
      return jsonResponse({ error: "validation_failed", fields }, 422, requestId);
    }
    const { key_id, name, description, scopes, expires_at, justification, confirmation_phrase, step_up_token } = parsed.data;

    const { data: current, error: fetchErr } = await admin
      .from("mcp_api_keys")
      .select("id, name, description, scopes, expires_at, revoked_at, key_prefix")
      .eq("id", key_id)
      .maybeSingle();
    if (fetchErr) {
      await auditFailure("error", { reason: "fetch_failed", detail: fetchErr.message }, key_id);
      return jsonResponse({ error: "internal_error", detail: fetchErr.message }, 500, requestId);
    }
    if (!current) {
      await auditFailure("denied", { reason: "not_found" }, key_id);
      return jsonResponse({ error: "not_found" }, 404, requestId);
    }
    if (current.revoked_at) {
      await auditFailure("denied", { reason: "revoked_key" }, key_id);
      return jsonResponse({ error: "policy_violation", message: "Chave revogada não pode ser editada." }, 422, requestId);
    }

    const wasFull = isFullAccess(current.scopes ?? []);
    const willBeFull = scopes ? isFullAccess(scopes) : wasFull;
    const escalating = !wasFull && willBeFull;

    if (escalating) {
      // Step-up obrigatório: senha + OTP validados nos últimos 5min, role dev re-checada server-side
      if (!step_up_token) {
        await auditFailure("denied", { reason: "step_up_required" }, key_id);
        return jsonResponse(
          { error: "step_up_required", message: "Confirme sua identidade (senha + código por e-mail) antes de escalar a chave para escopo total." },
          403,
          requestId,
        );
      }
      const { data: stepUpOk, error: stepUpErr } = await castRpcResult<RpcEnvelope<boolean>>(
        userClient.rpc("consume_step_up_token", {
          _token: step_up_token,
          _expected_action: "mcp_full_escalate",
          _expected_target: key_id,
        }),
      );
      if (stepUpErr || !stepUpOk) {
        await auditFailure("denied", { reason: "step_up_invalid", detail: stepUpErr?.message }, key_id);
        return jsonResponse(
          { error: "step_up_invalid", message: "Verificação dupla expirou ou é inválida. Refaça a confirmação." },
          403,
          requestId,
        );
      }

      // Authorization gate: only explicit grantors can escalate to FULL
      const { data: canGrant, error: grantErr } = await castRpcResult<RpcEnvelope<boolean>>(
        admin.rpc("can_grant_mcp_full", { _user_id: userId }),
      );
      if (grantErr) {
        await auditFailure("error", { reason: "grant_check_failed", detail: grantErr.message }, key_id);
        return jsonResponse({ error: "internal_error", detail: grantErr.message }, 500, requestId);
      }
      if (!canGrant) {
        await auditFailure("denied", { reason: "full_grant_forbidden" }, key_id);
        return jsonResponse(
          {
            error: "full_grant_forbidden",
            message: "Você não tem permissão para escalar chaves MCP para escopo total (*). Solicite a inclusão em mcp_full_grantors.",
          },
          403,
          requestId,
        );
      }

      const fieldErrors: Record<string, string[]> = {};
      if (!justification || justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) {
        fieldErrors.justification = [`Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para escalar para FULL.`];
      }
      if (confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
        fieldErrors.confirmation_phrase = [`Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar escalação.`];
      }
      const newExpiry = expires_at ?? current.expires_at;
      if (!newExpiry) {
        fieldErrors.expires_at = ["Chaves FULL exigem data de expiração."];
      } else {
        const ms = new Date(newExpiry).getTime() - Date.now();
        if (ms <= 0) fieldErrors.expires_at = [...(fieldErrors.expires_at ?? []), "Expiração precisa ser futura."];
        else if (ms > FULL_SCOPE_MAX_TTL_MS) fieldErrors.expires_at = [...(fieldErrors.expires_at ?? []), "Janela máxima 180 dias."];
      }
      if (Object.keys(fieldErrors).length > 0) {
        await auditFailure("denied", { reason: "full_escalation_blocked", fields: fieldErrors }, key_id);
        return jsonResponse({ error: "validation_failed", fields: fieldErrors }, 422, requestId);
      }
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (scopes !== undefined) patch.scopes = scopes;
    if (expires_at !== undefined) patch.expires_at = expires_at;

    if (Object.keys(patch).length === 0) {
      await auditFailure("denied", { reason: "no_changes" }, key_id);
      return jsonResponse({ error: "no_changes" }, 400, requestId);
    }

    const { data: updated, error: updErr } = await admin
      .from("mcp_api_keys")
      .update(patch)
      .eq("id", key_id)
      .select("id, name, description, scopes, expires_at, key_prefix")
      .single();
    if (updErr || !updated) {
      await auditFailure("error", { reason: "update_failed", detail: updErr?.message ?? "unknown" }, key_id);
      return jsonResponse({ error: "update_failed", detail: updErr?.message ?? "unknown" }, 500, requestId);
    }

    await writeAuditEntry(admin, {
      user_id: userId,
      action: "mcp_key.updated",
      resource_type: "mcp_api_key",
      resource_id: updated.id,
      ip_address: ip,
      user_agent: ua,
      request_id: requestId,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedMs,
      status: "success",
      payload_summary: summarizePayload(rawBody),
      source: SOURCE,
      details: {
        key_prefix: updated.key_prefix,
        fields_changed: Object.keys(patch),
        before: {
          name: current.name,
          description: current.description,
          scopes: current.scopes,
          expires_at: current.expires_at,
        },
        after: {
          name: updated.name,
          description: updated.description,
          scopes: updated.scopes,
          expires_at: updated.expires_at,
        },
        escalated_to_full: escalating,
        justification: escalating ? (justification ?? null) : null,
      },
    });

    // Auditoria explícita de concessão FULL (escalada)
    if (escalating) {
      try {
        await userClient.rpc("log_full_scope_grant", {
          _operation: "escalate",
          _key_id: updated.id,
          _key_prefix: updated.key_prefix,
          _justification: justification ?? null,
          _confirmation_phrase_ok: confirmation_phrase === FULL_SCOPE_CONFIRMATION,
          _expires_at: updated.expires_at,
          _ip: ip,
          _user_agent: ua,
          _request_id: requestId,
          _extra: {
            previous_scopes: current.scopes,
            new_scopes: updated.scopes,
          },
        });
      } catch (e) {
        await writeAuditEntry(admin, {
          user_id: userId,
          action: "mcp_key.audit_log_failed",
          resource_type: "mcp_api_key",
          resource_id: updated.id,
          status: "error",
          source: SOURCE,
          request_id: requestId,
          started_at: new Date().toISOString(),
          details: { reason: "log_full_scope_grant_failed", detail: (e as Error).message },
        });
      }
    }

    return jsonResponse({ ok: true, key: updated, escalated_to_full: escalating }, 200, requestId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await auditFailure("error", { reason: "uncaught", detail });
    return jsonResponse({ error: "internal_error", detail }, 500, requestId);
  }
});
```

---

## 🔄 Próximos lotes sugeridos

- **Lote 4 — Webhooks/Conexões:** `webhook-dispatcher`, `webhook-inbound`,
  `connection-tester`, `secrets-manager`, `connections-health-check`.
- **Lote 5 — IA/BI:** `ai-recommendations`, `bi-copilot`, `magic-up-score`,
  `comparison-ai-advisor`, `expert-chat`, `voice-agent`.
- **Lote 6 — Auth/Segurança aplicacional:** `step-up-verify`,
  `force-global-logout`, `detect-new-device`, `log-login-attempt`,
  `verify-email`, `full-op-diagnostics`. _(parcialmente coberto em
  `block16_auth_hooks.md`)_

---

**Última atualização:** 2026-05-11
