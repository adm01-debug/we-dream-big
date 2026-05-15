// Tests for the runtime type guard `assertServiceClient`.
//
// Estes testes não importam o módulo principal (que chama `Deno.serve` no
// import) — re-implementamos o guard inline com a mesma lógica para validar
// a forma. Se o guard mudar em index.ts, este teste deve ser sincronizado.
//
// Cenários cobertos:
//   - aceita objeto com .from / .rpc / .auth (forma de SupabaseClient)
//   - rejeita null / undefined / primitivos
//   - rejeita objetos faltando métodos esperados
//   - mensagens de erro listam exatamente o que está faltando

import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ────────────────────────────────────────────────────────────────────────────
// Re-implementação espelhada do guard (mantém o teste isolado do Deno.serve)
// ────────────────────────────────────────────────────────────────────────────
function assertServiceClient(client: unknown): asserts client is { from: unknown; rpc: unknown; auth: unknown } {
  if (!client || typeof client !== "object") {
    throw new TypeError(
      `[connections-auto-test] service client inválido: esperado SupabaseClient, recebeu ${client === null ? "null" : typeof client}`,
    );
  }
  const c = client as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof c.from !== "function") missing.push(".from()");
  if (typeof c.rpc !== "function") missing.push(".rpc()");
  if (typeof c.auth !== "object" || c.auth === null) missing.push(".auth");
  if (missing.length > 0) {
    throw new TypeError(
      `[connections-auto-test] service client não satisfaz a forma de SupabaseClient — faltando: ${missing.join(", ")}. ` +
      `Verifique se createClient<Database, 'public'> está alinhado com o schema esperado por runConnectionTest.`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Casos válidos
// ────────────────────────────────────────────────────────────────────────────

Deno.test("assertServiceClient: aceita mock com forma de SupabaseClient", () => {
  const fakeClient = {
    from: () => ({ select: () => ({}) }),
    rpc: () => Promise.resolve({}),
    auth: { getUser: () => Promise.resolve({}) },
  };
  // Não deve lançar
  assertServiceClient(fakeClient);
  // E o type narrowing está funcionando após o guard:
  assert(typeof fakeClient.from === "function");
});

// ────────────────────────────────────────────────────────────────────────────
// Casos inválidos: tipos primitivos / null / undefined
// ────────────────────────────────────────────────────────────────────────────

Deno.test("assertServiceClient: rejeita null", () => {
  const err = assertThrows(() => assertServiceClient(null), TypeError);
  assert(err.message.includes("recebeu null"), `mensagem: ${err.message}`);
});

Deno.test("assertServiceClient: rejeita undefined", () => {
  const err = assertThrows(() => assertServiceClient(undefined), TypeError);
  assert(err.message.includes("recebeu undefined"), `mensagem: ${err.message}`);
});

Deno.test("assertServiceClient: rejeita string / number / boolean", () => {
  for (const value of ["", "client", 42, true, false]) {
    const err = assertThrows(() => assertServiceClient(value), TypeError);
    assert(err.message.includes("esperado SupabaseClient"), `mensagem para ${typeof value}: ${err.message}`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Casos inválidos: objeto com forma divergente
// ────────────────────────────────────────────────────────────────────────────

Deno.test("assertServiceClient: rejeita objeto vazio listando todos os campos faltando", () => {
  const err = assertThrows(() => assertServiceClient({}), TypeError);
  assert(err.message.includes(".from()"), `falta .from(): ${err.message}`);
  assert(err.message.includes(".rpc()"), `falta .rpc(): ${err.message}`);
  assert(err.message.includes(".auth"), `falta .auth: ${err.message}`);
});

Deno.test("assertServiceClient: rejeita objeto faltando apenas .rpc", () => {
  const partial = {
    from: () => ({}),
    auth: { getUser: () => Promise.resolve({}) },
    // .rpc ausente
  };
  const err = assertThrows(() => assertServiceClient(partial), TypeError);
  assert(err.message.includes(".rpc()"), `mensagem: ${err.message}`);
  // Não deve listar os que existem
  assertEquals(err.message.includes(".from()"), false);
  assertEquals(err.message.includes(".auth,") || err.message.includes(".auth.") || err.message.endsWith(".auth"), false);
});

Deno.test("assertServiceClient: rejeita objeto com .auth como null", () => {
  // Caso real: createClient com configuração quebrada pode retornar auth=null.
  const broken = {
    from: () => ({}),
    rpc: () => ({}),
    auth: null,
  };
  const err = assertThrows(() => assertServiceClient(broken), TypeError);
  assert(err.message.includes(".auth"), `mensagem: ${err.message}`);
});

Deno.test("assertServiceClient: rejeita objeto com .from sendo string (não função)", () => {
  const wrongShape = {
    from: "external_connections", // typo comum: alguém passou o nome da tabela
    rpc: () => ({}),
    auth: {},
  };
  const err = assertThrows(() => assertServiceClient(wrongShape), TypeError);
  assert(err.message.includes(".from()"), `mensagem: ${err.message}`);
});

Deno.test("assertServiceClient: mensagem de erro inclui dica acionável (alinhamento de schema)", () => {
  const err = assertThrows(() => assertServiceClient({}), TypeError);
  assert(
    err.message.includes("createClient") && err.message.includes("schema"),
    `mensagem deve orientar correção: ${err.message}`,
  );
});
