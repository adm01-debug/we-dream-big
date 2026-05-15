import { getCorsHeaders } from "../_shared/cors.ts";
// connections-auto-test: cron-driven (every 15min). Re-tests every active
// connection in `external_connections` and updates last_test_* fields +
// inserts a row in `connection_test_history` with triggered_by='cron'.
//
// AUTORIZAÇÃO (Onda 1 hardening, 2026-05-14):
//   - Modo C: header `x-cron-secret: <SECRET>` (cron job)
//   - Retrocompat: se CONNECTIONS_AUTO_TEST_SECRET não estiver setado, aceita anônimo com warning
//
// Ver: supabase/functions/_shared/dispatcher-auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { runConnectionTest, type ConnectionType, isTransientFailure } from "../_shared/connection-test-runner.ts";
import { resolveTimeout } from "../_shared/connection-timeouts.ts";
import {
  type CompatibleSupabaseClient,
  type ServiceClient,
  assertServiceClient as sharedAssertServiceClient,
  castSupabaseClient,
} from "../_shared/supabase-client-adapter.ts";
import { authorizeCron } from "../_shared/dispatcher-auth.ts";

// ───────────────────────────────────────────────────────────────────────
// Schema-validated service client (re-exports do adapter compartilhado)
// ───────────────────────────────────────────────────────────────────────
// As definições agora vivem em `_shared/supabase-client-adapter.ts` para que
// outras edge functions possam reusar o mesmo padrão sem duplicação.
// Re-exportamos aqui para preservar a API pública desta função (callers
// internos continuam importando `ServiceClient` / `CompatibleSupabaseClient` /
// `assertServiceClient` deste módulo).
export type { CompatibleSupabaseClient, ServiceClient };
export function assertServiceClient(client: unknown): asserts client is ServiceClient {
  sharedAssertServiceClient(client, "connections-auto-test");
}

const BATCH_SIZE = 5;
// Backoff schedule between attempts. Length defines max attempts (3 = 1 try + 2 retries).
// Index N is the delay BEFORE attempt N+1 (so RETRY_BACKOFF_MS[0] is wait before retry #1).
const RETRY_BACKOFF_MS = [500, 1500, 3000] as const;
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

export interface ActiveConnection {
  id: string;
  type: string;
  name: string;
  env_key: string | null;
  config: Record<string, unknown> | null;
  created_by: string;
}

export async function processBatch<
  // deno-lint-ignore no-explicit-any
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public" & string
    : string & keyof Database,
>(
  service: CompatibleSupabaseClient<Database, SchemaName>,
  batch: ActiveConnection[],
) {
  // runConnectionTest exige `SupabaseClient` com schema 'public' (default).
  // O adapter compartilhado faz o narrow estruturalmente seguro uma única vez.
  const serviceForRunner = castSupabaseClient(service);

  return Promise.all(batch.map(async (conn) => {
    const t0 = Date.now();
    try {
      const cfg = (conn.config && typeof conn.config === "object")
        ? Object.fromEntries(
            Object.entries(conn.config as Record<string, unknown>)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k, v as string]),
          )
        : {};
      const connType = conn.type as ConnectionType;
      const perTypeTimeout = resolveTimeout(connType);
      const baseArgs = {
        type: connType,
        config: cfg,
        env_key: (conn.env_key as "promobrind" | "crm" | null) ?? undefined,
        connection_id: conn.id,
        created_by: conn.created_by,
        triggered_by: "cron" as const,
        service: serviceForRunner,
        timeoutMs: perTypeTimeout,
      };


      // Probe up to MAX_ATTEMPTS times. Each attempt skips persistence so we
      // don't write intermediate "failed" rows in connection_test_history;
      // only the final outcome is persisted with the correct attempts count.
      let attempt = 1;
      let probe = await runConnectionTest({ ...baseArgs, attempts: 1, skipPersistence: true });
      while (!probe.ok && isTransientFailure(probe) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt - 1] ?? 1000));
        attempt += 1;
        probe = await runConnectionTest({ ...baseArgs, attempts: attempt, skipPersistence: true });
      }

      // Persist the final outcome (one row, with the real attempts count).
      const final = await runConnectionTest({ ...baseArgs, attempts: attempt });

      console.log(JSON.stringify({
        evt: "auto-test",
        type: conn.type,
        name: conn.name,
        ok: final.ok,
        status: final.status,
        latency_ms: final.latency_ms,
        timeout_ms: perTypeTimeout,
        wall_ms: Date.now() - t0,
        attempts: attempt,
        retried: attempt > 1,
        error: final.error,
        error_kind: final.error_kind,
      }));
      return { id: conn.id, ok: final.ok, latency_ms: final.latency_ms ?? null, attempts: attempt };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      console.error(JSON.stringify({ evt: "auto-test-error", id: conn.id, type: conn.type, error: msg }));
      return { id: conn.id, ok: false, latency_ms: null, attempts: 1, error: msg };
    }
  }));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  // Hardening Onda 1: valida x-cron-secret
  const auth = await authorizeCron(req, {
    corsHeaders,
    secretEnvName: "CONNECTIONS_AUTO_TEST_SECRET",
    headerName: "x-cron-secret",
  });
  if (!auth.ok) return auth.response;

  const startedAt = Date.now();
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Validação de tipo (estática + runtime) antes de qualquer chamada batch:
    // garante que o client tem a forma esperada por processBatch / runConnectionTest.
    assertServiceClient(service);

    const { data: active, error } = await service
      .from("external_connections")
      .select("id, type, name, env_key, config, created_by")
      .eq("status", "active")
      .eq("auto_test_enabled", true);
    if (error) throw error;

    const conns = (active ?? []) as ActiveConnection[];
    if (conns.length === 0) {
      return new Response(JSON.stringify({ ok: true, tested: 0, skipped: 0, ok_count: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; ok: boolean; latency_ms: number | null; attempts: number; error?: string }> = [];
    for (let i = 0; i < conns.length; i += BATCH_SIZE) {
      const batch = conns.slice(i, i + BATCH_SIZE);
      const r = await processBatch(service, batch);
      results.push(...r);
    }

    const ok_count = results.filter((r) => r.ok).length;
    const failed = results.length - ok_count;
    const retried = results.filter((r) => r.attempts > 1).length;
    const recovered = results.filter((r) => r.ok && r.attempts > 1).length;
    const summary = {
      ok: true,
      tested: results.length,
      ok_count,
      failed,
      retried,
      recovered,
      duration_ms: Date.now() - startedAt,
    };
    console.log(JSON.stringify({ evt: "auto-test-summary", ...summary }));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    console.error(JSON.stringify({ evt: "auto-test-fatal", error: msg }));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
