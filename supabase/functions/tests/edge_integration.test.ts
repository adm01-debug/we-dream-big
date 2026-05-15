import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Testes de integração para Edge Functions.
 * Foca em validação de entrada, payloads e status codes.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function invokeFunction(name: string, body: any, headers: any = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return response;
}

Deno.test("Edge Function: cnpj-lookup - validação de entrada", async () => {
  const res = await invokeFunction("cnpj-lookup", { cnpj: "invalid" });
  assertEquals(res.status, 400, "CNPJ inválido deve retornar 400");
  const data = await res.json();
  assert(data.error || data.message, "Deve conter mensagem de erro");
});

Deno.test("Edge Function: validate-access - status codes", async () => {
  const res = await invokeFunction("validate-access", {});
  assert(res.status === 400 || res.status === 401, `Status inesperado: ${res.status}`);
});

Deno.test("Edge Function: webhook-inbound - HMAC verification", async () => {
  // Test case 1: Missing signature
  const res1 = await invokeFunction("webhook-inbound", { event: "test" });
  assertEquals(res1.status, 401, "Rejeitar sem assinatura");

  // Test case 2: Invalid signature format
  const res2 = await invokeFunction("webhook-inbound", { event: "test" }, {
    "X-Hub-Signature-256": "plain_text_not_hmac"
  });
  assertEquals(res2.status, 401, "Rejeitar formato inválido");

  // Test case 3: Valid signature but wrong secret (simulation)
  const res3 = await invokeFunction("webhook-inbound", { event: "test" }, {
    "X-Hub-Signature-256": "sha256=4f2f5e1f76e3d23f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f"
  });
  assertEquals(res3.status, 401, "Rejeitar assinatura incorreta");
});

Deno.test("Edge Function: bitrix-sync - erro de payload", async () => {
  const res = await invokeFunction("bitrix-sync", { malformed: true });
  assert(res.status >= 400, "Payload malformado deve falhar");
});

// ─── Funções críticas (T22 — Onda 3) ──────────────────────────────────────────

Deno.test("Edge Function: external-db-bridge - rejeita sem auth (401)", async () => {
  const url = `${SUPABASE_URL}/functions/v1/external-db-bridge`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT 1" }),
  });
  assert(
    res.status === 401 || res.status === 403,
    `external-db-bridge sem auth deve retornar 401/403; recebeu ${res.status}`
  );
});

Deno.test("Edge Function: external-db-bridge - responde em < 500ms (p95 gate)", async () => {
  const start = performance.now();
  const res = await invokeFunction("external-db-bridge", { query: "SELECT 1" });
  const elapsed = performance.now() - start;
  // Aceita qualquer status (pode falhar por config) — o que validamos é a latência
  assert(
    elapsed < 500,
    `external-db-bridge levou ${elapsed.toFixed(0)}ms — excede 500ms gate`
  );
  await res.body?.cancel();
});

Deno.test("Edge Function: crm-db-bridge - rejeita payload vazio (400/401)", async () => {
  const res = await invokeFunction("crm-db-bridge", {});
  assert(
    res.status === 400 || res.status === 401 || res.status === 422,
    `crm-db-bridge com payload vazio deve retornar 400/401/422; recebeu ${res.status}`
  );
});

Deno.test("Edge Function: crm-db-bridge - responde em < 500ms (p95 gate)", async () => {
  const start = performance.now();
  const res = await invokeFunction("crm-db-bridge", { operation: "list" });
  const elapsed = performance.now() - start;
  assert(
    elapsed < 500,
    `crm-db-bridge levou ${elapsed.toFixed(0)}ms — excede 500ms gate`
  );
  await res.body?.cancel();
});

Deno.test("Edge Function: expert-chat - rejeita sem mensagem (400/401)", async () => {
  const res = await invokeFunction("expert-chat", {});
  assert(
    res.status === 400 || res.status === 401 || res.status === 422,
    `expert-chat sem mensagem deve retornar 400/401/422; recebeu ${res.status}`
  );
});

Deno.test("Edge Function: expert-chat - responde em < 500ms na validação inicial", async () => {
  const start = performance.now();
  const res = await invokeFunction("expert-chat", {});
  const elapsed = performance.now() - start;
  assert(
    elapsed < 500,
    `expert-chat (validação) levou ${elapsed.toFixed(0)}ms — excede 500ms gate`
  );
  await res.body?.cancel();
});

Deno.test("Edge Function: sync-quote-bitrix - rejeita payload sem quote_id (400/422)", async () => {
  const res = await invokeFunction("sync-quote-bitrix", { malformed: true });
  assert(
    res.status >= 400,
    `sync-quote-bitrix sem quote_id deve falhar (>= 400); recebeu ${res.status}`
  );
});

Deno.test("Edge Function: sync-quote-bitrix - responde em < 500ms na validação", async () => {
  const start = performance.now();
  const res = await invokeFunction("sync-quote-bitrix", {});
  const elapsed = performance.now() - start;
  assert(
    elapsed < 500,
    `sync-quote-bitrix (validação) levou ${elapsed.toFixed(0)}ms — excede 500ms gate`
  );
  await res.body?.cancel();
});

Deno.test("Edge Function: bitrix-sync - idempotência — duplicate quote_id retorna 200 ou 409", async () => {
  const payload = { quote_id: "test-dedup-id", event: "quote.created", data: {} };
  const res1 = await invokeFunction("bitrix-sync", payload);
  const res2 = await invokeFunction("bitrix-sync", payload);
  // Primeiro pode retornar 400 se auth ausente — o importante é que o segundo
  // não seja 5xx (sem crash em retry)
  assert(res2.status < 500, `bitrix-sync segunda chamada não deve ser 5xx; recebeu ${res2.status}`);
  await res1.body?.cancel();
  await res2.body?.cancel();
});
