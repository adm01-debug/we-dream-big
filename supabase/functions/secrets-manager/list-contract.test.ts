/**
 * Testes de integração para o secrets-manager.
 *
 * Foco: garantir que quando há linhas em `integration_credentials`,
 * a resposta de `action: "list"` retorna `has_value: true` e
 * `source: "db"` — base do contrato que impede o badge "Sem credenciais"
 * na UI de /admin/conexoes.
 *
 * NOTA: este teste assume que o ambiente tem (a) supabase local rodando
 * (deno test --allow-net --allow-env) ou (b) variáveis VITE_SUPABASE_*
 * apontando para o projeto remoto + um JWT de admin opcional em
 * TEST_ADMIN_JWT. Se nenhum estiver disponível, os testes são pulados.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ADMIN_JWT = Deno.env.get("TEST_ADMIN_JWT") ?? "";

const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/secrets-manager` : "";

async function callList(token: string) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "list" }),
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, body, text };
}

Deno.test("secrets-manager: rejeita request sem JWT (401)", async () => {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.warn("⚠️ pulando: VITE_SUPABASE_URL/PUBLISHABLE_KEY ausentes");
    return;
  }
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ action: "list" }),
  });
  await res.text(); // consume body
  assertEquals(res.status, 401, "esperava 401 para request sem Authorization");
});

Deno.test("secrets-manager: list retorna shape esperado para admin", async () => {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.warn("⚠️ pulando: env ausente");
    return;
  }
  if (!ADMIN_JWT) {
    console.warn("⚠️ pulando: TEST_ADMIN_JWT ausente — defina para validar contrato");
    return;
  }

  const { status, body } = await callList(ADMIN_JWT);
  assertEquals(status, 200, `esperava 200, recebeu ${status}: ${JSON.stringify(body)}`);

  const payload = body as { ok: boolean; secrets: Array<Record<string, unknown>> };
  assert(payload.ok === true, "payload.ok deve ser true");
  assert(Array.isArray(payload.secrets), "payload.secrets deve ser array");

  // Cada secret deve expor o contrato consumido por SupabaseConnectionsTab
  for (const s of payload.secrets) {
    assert(typeof s.name === "string", "name deve ser string");
    assert(typeof s.has_value === "boolean", `${s.name}: has_value deve ser boolean`);
    assert(
      s.source === "db" || s.source === "env" || s.source === "none",
      `${s.name}: source inválido (${s.source})`,
    );
  }
});

Deno.test(
  "secrets-manager: quando integration_credentials tem Promobrind, has_value=true e source=db",
  async () => {
    if (!SUPABASE_URL || !ANON_KEY || !ADMIN_JWT) {
      console.warn("⚠️ pulando: env ou TEST_ADMIN_JWT ausente");
      return;
    }

    const { status, body } = await callList(ADMIN_JWT);
    assertEquals(status, 200);
    const secrets = (body as { secrets: Array<{ name: string; has_value: boolean; source: string }> }).secrets;

    const url = secrets.find((s) => s.name === "EXTERNAL_PROMOBRIND_URL");
    const key = secrets.find((s) => s.name === "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");

    assert(url, "secrets-manager deveria reportar EXTERNAL_PROMOBRIND_URL");
    assert(key, "secrets-manager deveria reportar EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");

    // Contrato que protege o card de mostrar "Sem credenciais"
    assertEquals(url!.has_value, true, "URL deve estar configurada (DB-first)");
    assertEquals(key!.has_value, true, "Service Role Key deve estar configurada");
    assertEquals(url!.source, "db", "URL deve vir do DB (não fallback ENV)");
    assertEquals(key!.source, "db", "Key deve vir do DB (não fallback ENV)");
  },
);
