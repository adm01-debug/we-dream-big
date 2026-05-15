/**
 * Garante que múltiplas requests/chamadas concorrentes a `getCrmClient`
 * reutilizam o MESMO SupabaseClient (singleton por isolate) — sem criar
 * clientes adicionais.
 *
 * Estratégia:
 *  1. Define env vars fake antes de importar o módulo.
 *  2. Dispara N chamadas em paralelo a `getCrmClient()`.
 *  3. Verifica que:
 *     - todas retornam a MESMA referência de objeto;
 *     - `clientBuildMs` foi registrado UMA ÚNICA VEZ
 *       (registrado apenas na primeira construção em buildCrmClient).
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Garante credenciais antes do import (módulo lê env no boot).
if (!Deno.env.get("CRM_SUPABASE_URL")) {
  Deno.env.set("CRM_SUPABASE_URL", "https://fake-crm.supabase.co");
}
if (!Deno.env.get("CRM_SUPABASE_SERVICE_KEY") && !Deno.env.get("CRM_SUPABASE_ANON_KEY")) {
  Deno.env.set("CRM_SUPABASE_SERVICE_KEY", "fake-key-for-singleton-test");
}

const mod = await import("./index.ts");
const { getCrmClient, __getClientBootStateForTests } = mod as {
  getCrmClient: () => Promise<unknown>;
  __getClientBootStateForTests: () => { cached: unknown; clientBuildMs: number | null };
};

Deno.test("crm-db-bridge: singleton client é reutilizado em chamadas concorrentes", async () => {
  const CONCURRENCY = 50;

  const clients = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => getCrmClient()),
  );

  const first = clients[0];
  assert(first !== null, "Esperava client instanciado (env vars fake setadas)");

  for (let i = 1; i < clients.length; i++) {
    assertStrictEquals(
      clients[i],
      first,
      `Chamada concorrente #${i} retornou client diferente — singleton quebrado`,
    );
  }

  const state = __getClientBootStateForTests();
  assertStrictEquals(state.cached, first, "Cache do módulo deve apontar para o mesmo client");
  assert(
    typeof state.clientBuildMs === "number" && state.clientBuildMs >= 0,
    "clientBuildMs deve ter sido medido exatamente uma vez (na 1ª construção)",
  );
});

Deno.test("crm-db-bridge: chamadas sequenciais também reutilizam o client", async () => {
  const a = await getCrmClient();
  const b = await getCrmClient();
  const c = await getCrmClient();
  assertStrictEquals(a, b);
  assertStrictEquals(b, c);
});
