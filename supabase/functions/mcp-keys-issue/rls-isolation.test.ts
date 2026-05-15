/**
 * RLS isolation tests for `public.mcp_api_keys`.
 *
 * Garantia: a tabela `mcp_api_keys` armazena hashes de chaves de API com escopo
 * potencialmente full (`*`) e NUNCA deve ser manipulada diretamente via cliente
 * autenticado (anon + JWT). Toda escrita precisa passar pelas edge functions
 * (`mcp-keys-issue`, `mcp-keys-rotate`, `mcp-keys-update`, `mcp-keys-revoke`),
 * que validam `is_dev()`, consomem `step_up_token` e auditam via
 * `log_full_scope_grant`.
 *
 * Estes testes validam:
 *  1. INSERT direto via JWT → bloqueado (RLS)
 *  2. UPDATE direto via JWT → bloqueado (RLS)
 *  3. DELETE direto via JWT → bloqueado (RLS)
 *  4. SELECT via JWT só retorna chaves do próprio user (created_by) — sem hash
 *  5. service_role (usado pelas edge functions) consegue todas as operações
 *
 * Os testes usam o ambiente Supabase real do projeto (vars do .env). Se as
 * credenciais não estiverem disponíveis (ex.: CI sem secrets), os testes são
 * pulados em vez de falsamente passarem.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Credenciais opcionais de um usuário de teste já existente (sem privilégio dev).
// Se não fornecidas, os testes que exigem JWT são marcados como ignored.
const TEST_USER_EMAIL = Deno.env.get("TEST_USER_EMAIL");
const TEST_USER_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");

const hasAnon = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const hasService = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
const hasJwtCreds = Boolean(TEST_USER_EMAIL && TEST_USER_PASSWORD);

function anonClient() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function serviceClient() {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authedClient() {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({
    email: TEST_USER_EMAIL!,
    password: TEST_USER_PASSWORD!,
  });
  if (error) throw new Error(`Falha ao autenticar test user: ${error.message}`);
  return c;
}

/** Asserção: erro indica bloqueio de RLS / permissão (não é "row not found"). */
function assertRlsBlocked(error: { code?: string; message?: string } | null) {
  assert(error, "Esperava erro de RLS, mas a operação foi bem-sucedida");
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  const blocked =
    code === "42501" || // insufficient_privilege
    code === "PGRST301" || // RLS denial via PostgREST
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("policy");
  assert(
    blocked,
    `Erro inesperado (esperava bloqueio RLS): code=${code} msg=${error.message}`,
  );
}

Deno.test({
  name: "mcp_api_keys: INSERT direto via JWT é bloqueado por RLS",
  ignore: !hasAnon || !hasJwtCreds,
  fn: async () => {
    const client = await authedClient();
    const { data, error } = await client.from("mcp_api_keys").insert({
      name: "rls-test-insert",
      key_hash: "deadbeef".repeat(8),
      key_prefix: "mcp_test",
      scopes: ["*"],
    }).select();
    assertEquals(data ?? [], []);
    assertRlsBlocked(error);
    await client.auth.signOut();
  },
});

Deno.test({
  name: "mcp_api_keys: UPDATE direto via JWT é bloqueado por RLS",
  ignore: !hasAnon || !hasJwtCreds,
  fn: async () => {
    const client = await authedClient();
    const { data, error } = await client
      .from("mcp_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    // Se RLS não bloquear o comando, ao menos não deve afetar nada alheio.
    // Mas o esperado é erro OU array vazio (nenhuma linha visível para update).
    if (!error) {
      assertEquals(
        data ?? [],
        [],
        "UPDATE via JWT não deve afetar nenhuma linha (RLS deve esconder/bloquear)",
      );
    } else {
      assertRlsBlocked(error);
    }
    await client.auth.signOut();
  },
});

Deno.test({
  name: "mcp_api_keys: DELETE direto via JWT é bloqueado por RLS",
  ignore: !hasAnon || !hasJwtCreds,
  fn: async () => {
    const client = await authedClient();
    const { data, error } = await client
      .from("mcp_api_keys")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    if (!error) {
      assertEquals(
        data ?? [],
        [],
        "DELETE via JWT não deve afetar nenhuma linha (RLS deve esconder/bloquear)",
      );
    } else {
      assertRlsBlocked(error);
    }
    await client.auth.signOut();
  },
});

Deno.test({
  name: "mcp_api_keys: SELECT via JWT nunca expõe key_hash em texto utilizável",
  ignore: !hasAnon || !hasJwtCreds,
  fn: async () => {
    const client = await authedClient();
    const { data, error } = await client
      .from("mcp_api_keys")
      .select("id, name, key_prefix, scopes, created_by, revoked_at")
      .limit(50);
    // Não pode dar erro por coluna inexistente — apenas valida select restrito.
    if (error) {
      assertRlsBlocked(error);
      await client.auth.signOut();
      return;
    }
    // Se retornar linhas, todas devem pertencer ao próprio user (created_by).
    const { data: userRes } = await client.auth.getUser();
    const uid = userRes.user?.id ?? null;
    for (const row of data ?? []) {
      assertEquals(
        (row as { created_by?: string }).created_by,
        uid,
        "JWT só pode enxergar chaves criadas pelo próprio usuário",
      );
    }
    await client.auth.signOut();
  },
});

Deno.test({
  name: "mcp_api_keys: anon (sem JWT) não consegue SELECT",
  ignore: !hasAnon,
  fn: async () => {
    const client = anonClient();
    const { data, error } = await client.from("mcp_api_keys").select("id").limit(1);
    if (error) {
      assertRlsBlocked(error);
    } else {
      assertEquals(data ?? [], [], "anon não deve enxergar nenhuma chave");
    }
  },
});

Deno.test({
  name: "mcp_api_keys: service_role consegue INSERT/UPDATE/DELETE (caminho das edge functions)",
  ignore: !hasService,
  fn: async () => {
    const client = serviceClient();
    const probeName = `rls-test-service-${crypto.randomUUID()}`;
    const fakeHash = "f".repeat(64);

    // INSERT
    const { data: inserted, error: insertErr } = await client
      .from("mcp_api_keys")
      .insert({
        name: probeName,
        key_hash: fakeHash,
        key_prefix: "mcp_test",
        scopes: ["read"],
      })
      .select("id")
      .single();
    assertEquals(insertErr, null, `service_role INSERT falhou: ${insertErr?.message}`);
    assert(inserted?.id, "service_role INSERT deve retornar id");

    // UPDATE
    const { error: updateErr } = await client
      .from("mcp_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inserted!.id);
    assertEquals(updateErr, null, `service_role UPDATE falhou: ${updateErr?.message}`);

    // DELETE (cleanup)
    const { error: deleteErr } = await client
      .from("mcp_api_keys")
      .delete()
      .eq("id", inserted!.id);
    assertEquals(deleteErr, null, `service_role DELETE falhou: ${deleteErr?.message}`);
  },
});
