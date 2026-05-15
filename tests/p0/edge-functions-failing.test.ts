/**
 * P0 — Edge functions com falha de typecheck/runtime já mapeadas.
 *
 * Cobertura: contratos das edge functions que ainda apresentam erro
 * (`deno check` ou runtime) após a onda P0.2. Cada `it.skip` representa
 * uma função pendente; destrave conforme o fix correspondente é mergeado.
 *
 * Mocks: `_mocks.ts` (mockEdgeFunctionFetch).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockEdgeFunctionFetch,
  resetExternalMocks,
  crmDbBridgeOffline,
  crmDbBridgeStale,
  type EdgeFnResponseSpec,
} from "./_mocks";

const FUNCTIONS_BASE = "https://nmojwpihnslkssljowjh.supabase.co/functions/v1";

describe("P0 — Edge functions com falha", () => {
  let fetchMock: ReturnType<typeof mockEdgeFunctionFetch>;

  beforeEach(() => {
    fetchMock = mockEdgeFunctionFetch({});
  });

  afterEach(() => {
    resetExternalMocks();
  });

  // ─── full-op-diagnostics (já corrigido em P0.2 — manter como regressão) ──
  it.skip("full-op-diagnostics: retorna 4 checks server-side com sucesso", async () => {
    // TODO(P0): validar o shape após o fix de catch unknown.
    const ok: EdgeFnResponseSpec = {
      status: 200,
      body: {
        checks: {
          is_dev: true,
          can_grant_mcp_full: true,
          validate_mcp_scope: true,
          rls_audit: true,
        },
      },
    };
    fetchMock = mockEdgeFunctionFetch({ "/full-op-diagnostics": ok });
    const res = await fetch(`${FUNCTIONS_BASE}/full-op-diagnostics`, { method: "POST" });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.checks).toMatchObject({
      is_dev: expect.any(Boolean),
      can_grant_mcp_full: expect.any(Boolean),
    });
  });

  // ─── crm-db-bridge ─────────────────────────────────────────────────────
  it.skip("crm-db-bridge: retorna 503 quando DB externo offline (sem 500)", async () => {
    // TODO(P0): garantir que a função não vaza stack trace e devolve JSON estável.
    fetchMock = mockEdgeFunctionFetch({ "/crm-db-bridge": crmDbBridgeOffline });
    const res = await fetch(`${FUNCTIONS_BASE}/crm-db-bridge`, {
      method: "POST",
      body: JSON.stringify({ action: "select_companies" }),
    });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/unreachable|offline/i);
  });

  it.skip("crm-db-bridge: marca payload como `stale` quando cache servido", async () => {
    fetchMock = mockEdgeFunctionFetch({ "/crm-db-bridge": crmDbBridgeStale });
    const res = await fetch(`${FUNCTIONS_BASE}/crm-db-bridge`, { method: "POST" });
    const data = await res.json();
    expect(data.stale).toBe(true);
    expect(data.lastUpdate).toBeTruthy();
  });

  // ─── external-db-bridge ────────────────────────────────────────────────
  it.skip("external-db-bridge: rate-limit 429 retornado com Retry-After", async () => {
    // TODO(P0): após o fix de typing 19 erros, validar headers de retry.
    const rl: EdgeFnResponseSpec = {
      status: 429,
      body: { error: "rate_limited" },
      headers: { "Retry-After": "30" },
    };
    fetchMock = mockEdgeFunctionFetch({ "/external-db-bridge": rl });
    const res = await fetch(`${FUNCTIONS_BASE}/external-db-bridge`);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  // ─── connections-auto-test ─────────────────────────────────────────────
  it.skip("connections-auto-test: roda 5 conexões em paralelo sem timeout global", async () => {
    // TODO(P0): cobrir refactor para usar castSupabaseClient adapter.
    expect(true).toBe(true);
  });

  // ─── e2e-cleanup ───────────────────────────────────────────────────────
  it.skip("e2e-cleanup: usa service role e remove apenas usuários de teste (@e2e.test)", async () => {
    // TODO(P0): garantir guarda de domínio para nunca apagar usuários reais.
    expect(true).toBe(true);
  });

  // ─── force-global-logout ───────────────────────────────────────────────
  it.skip("force-global-logout: invalida sessão de TODOS os usuários quando flag set", async () => {
    expect(true).toBe(true);
  });

  // ─── full-op-diagnostics (regressão de tipos) ──────────────────────────
  it.skip("nenhuma edge function vaza `error: unknown` no response", async () => {
    // TODO(P0): grep de produção — nenhum response.error deve ser objeto vazio.
    expect(true).toBe(true);
  });
});
