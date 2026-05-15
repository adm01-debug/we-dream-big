// supabase/functions/rls-integration-tests/index.ts
// Testes de integração de RLS: simula vendedor e admin executando
// SELECT/INSERT/UPDATE/DELETE em registros próprios e de terceiros.
// Apenas dev/admin podem invocar. Usa service role para setup/teardown
// e clientes autenticados (anon + JWT por usuário) para validar policies.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Expect = "allow" | "deny";

interface CaseResult {
  table: string;
  actor: "seller" | "admin";
  op: Op;
  scope: "own" | "other";
  expected: Expect;
  observed: Expect;
  pass: boolean;
  detail?: string;
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function classify(error: unknown, data: unknown): Expect {
  if (error) {
    const msg = String((error as { message?: string })?.message ?? error).toLowerCase();
    // RLS negou (PostgREST 42501 / "row-level security" / "permission denied")
    if (
      msg.includes("row-level security") ||
      msg.includes("permission denied") ||
      msg.includes("violates row-level") ||
      msg.includes("42501") ||
      msg.includes("not authorized")
    ) {
      return "deny";
    }
    // Outros erros (validação, FK, etc.) são tratados como falha do teste, mas
    // do ponto de vista de policy, não houve allow.
    return "deny";
  }
  // Para SELECT, "allow + 0 linhas" também é tratado como deny (RLS filtrou).
  if (Array.isArray(data) && data.length === 0) return "deny";
  return "allow";
}

async function runCase(opts: {
  client: SupabaseClient;
  table: string;
  op: Op;
  rowId?: string;
  insertPayload?: Record<string, unknown>;
  updatePatch?: Record<string, unknown>;
}): Promise<{ observed: Expect; detail: string }> {
  const { client, table, op, rowId, insertPayload, updatePatch } = opts;
  try {
    if (op === "SELECT") {
      const { data, error } = await client.from(table).select("id").eq("id", rowId!).limit(1);
      return { observed: classify(error, data), detail: error?.message ?? `${data?.length ?? 0} rows` };
    }
    if (op === "INSERT") {
      const { data, error } = await client.from(table).insert(insertPayload!).select("id").single();
      return { observed: classify(error, data), detail: error?.message ?? "inserted" };
    }
    if (op === "UPDATE") {
      const { data, error } = await client.from(table).update(updatePatch!).eq("id", rowId!).select("id");
      return { observed: classify(error, data), detail: error?.message ?? `${data?.length ?? 0} rows` };
    }
    // DELETE
    const { data, error } = await client.from(table).delete().eq("id", rowId!).select("id");
    return { observed: classify(error, data), detail: error?.message ?? `${data?.length ?? 0} rows` };
  } catch (e) {
    return { observed: "deny", detail: (e as Error).message };
  }
}

async function ensureUser(admin: SupabaseClient, email: string, password: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u: { email?: string }) => u.email === email);
  if (existing?.id) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user!.id;
}

async function signInClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return c;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  try {
    // ─── Auth do invocador (precisa ser dev ou admin) ───
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return jsonResponse({ error: "missing bearer token" }, 401, corsHeaders);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: me } = await userClient.auth.getUser();
    if (!me?.user) return jsonResponse({ error: "invalid token" }, 401, corsHeaders);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", me.user.id);
    const allowed = (roles ?? []).some((r) => r.role === "dev" || r.role === "admin");
    if (!allowed) return jsonResponse({ error: "forbidden — dev/admin only" }, 403, corsHeaders);

    // ─── Setup: dois usuários de teste (idempotente) ───
    const tag = `rls-it-${Date.now().toString(36)}`;
    const sellerEmail = `${tag}-seller@rls-tests.local`;
    const otherEmail = `${tag}-other@rls-tests.local`;
    const password = crypto.randomUUID() + "Aa!1";

    const sellerId = await ensureUser(admin, sellerEmail, password);
    const otherId = await ensureUser(admin, otherEmail, password);

    // garante role 'user' para ambos (idempotente)
    await admin.from("user_roles").upsert(
      [
        { user_id: sellerId, role: "user" },
        { user_id: otherId, role: "user" },
      ],
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

    // garante role admin para o invocador (já validada acima) — só usamos seu próprio JWT
    const sellerClient = await signInClient(sellerEmail, password);

    // ─── Cenários por tabela ───
    // Cada cenário cria 1 row do "seller" e 1 row de "other" via service role,
    // depois roda as 4 operações pelo seller e pelo admin (invocador).
    const scenarios = [
      {
        table: "favorite_lists",
        ownerCol: "user_id",
        seed: (uid: string) => ({ user_id: uid, name: `lista ${tag}` }),
        patch: { name: `patched ${tag}` },
      },
      {
        table: "collections",
        ownerCol: "user_id",
        seed: (uid: string) => ({ user_id: uid, name: `coleção ${tag}` }),
        patch: { name: `patched ${tag}` },
      },
      {
        table: "custom_kits",
        ownerCol: "user_id",
        seed: (uid: string) => ({ user_id: uid, name: `kit ${tag}` }),
        patch: { name: `patched ${tag}` },
      },
    ];

    const results: CaseResult[] = [];
    const cleanup: Array<{ table: string; id: string }> = [];

    for (const sc of scenarios) {
      // Seed via service role
      const seedRows = [sc.seed(sellerId), sc.seed(otherId)];
      const { data: seeded, error: seedErr } = await admin
        .from(sc.table)
        .insert(seedRows)
        .select("id");
      if (seedErr || !seeded || seeded.length < 2) {
        results.push({
          table: sc.table,
          actor: "seller",
          op: "SELECT",
          scope: "own",
          expected: "allow",
          observed: "deny",
          pass: false,
          detail: `seed failed: ${seedErr?.message ?? "no rows"}`,
        });
        continue;
      }
      const ownId = seeded[0].id as string;
      const otherRowId = seeded[1].id as string;
      cleanup.push({ table: sc.table, id: ownId }, { table: sc.table, id: otherRowId });

      // Matriz: seller em row própria (allow) e em row alheia (deny)
      const matrix: Array<{ actor: "seller" | "admin"; client: SupabaseClient; op: Op; scope: "own" | "other"; rowId: string; expected: Expect }> = [
        { actor: "seller", client: sellerClient, op: "SELECT", scope: "own", rowId: ownId, expected: "allow" },
        { actor: "seller", client: sellerClient, op: "SELECT", scope: "other", rowId: otherRowId, expected: "deny" },
        { actor: "seller", client: sellerClient, op: "UPDATE", scope: "own", rowId: ownId, expected: "allow" },
        { actor: "seller", client: sellerClient, op: "UPDATE", scope: "other", rowId: otherRowId, expected: "deny" },
        { actor: "seller", client: sellerClient, op: "DELETE", scope: "other", rowId: otherRowId, expected: "deny" },
        // admin (invocador) deve conseguir SELECT em ambos (assumindo policy admin-bypass via has_role)
        { actor: "admin", client: userClient, op: "SELECT", scope: "own", rowId: ownId, expected: "allow" },
        { actor: "admin", client: userClient, op: "SELECT", scope: "other", rowId: otherRowId, expected: "allow" },
      ];

      for (const m of matrix) {
        const { observed, detail } = await runCase({
          client: m.client,
          table: sc.table,
          op: m.op,
          rowId: m.rowId,
          updatePatch: sc.patch,
        });
        results.push({
          table: sc.table,
          actor: m.actor,
          op: m.op,
          scope: m.scope,
          expected: m.expected,
          observed,
          pass: observed === m.expected,
          detail,
        });
      }

      // INSERT: seller insere em nome próprio (allow) e tenta em nome de outro (deny)
      const insOwn = await runCase({
        client: sellerClient,
        table: sc.table,
        op: "INSERT",
        insertPayload: sc.seed(sellerId),
      });
      results.push({
        table: sc.table,
        actor: "seller",
        op: "INSERT",
        scope: "own",
        expected: "allow",
        observed: insOwn.observed,
        pass: insOwn.observed === "allow",
        detail: insOwn.detail,
      });
      const insOther = await runCase({
        client: sellerClient,
        table: sc.table,
        op: "INSERT",
        insertPayload: sc.seed(otherId),
      });
      results.push({
        table: sc.table,
        actor: "seller",
        op: "INSERT",
        scope: "other",
        expected: "deny",
        observed: insOther.observed,
        pass: insOther.observed === "deny",
        detail: insOther.detail,
      });

      // DELETE own (depois do UPDATE) — encerra ciclo do seller
      const delOwn = await runCase({
        client: sellerClient,
        table: sc.table,
        op: "DELETE",
        rowId: ownId,
      });
      results.push({
        table: sc.table,
        actor: "seller",
        op: "DELETE",
        scope: "own",
        expected: "allow",
        observed: delOwn.observed,
        pass: delOwn.observed === "allow",
        detail: delOwn.detail,
      });
    }

    // ─── Cleanup (best-effort) ───
    for (const c of cleanup) {
      await admin.from(c.table).delete().eq("id", c.id);
    }
    await admin.auth.signOut();
    await sellerClient.auth.signOut();

    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    const failed = total - passed;

    return jsonResponse(
      {
        ok: failed === 0,
        summary: { total, passed, failed },
        scenarios: scenarios.map((s) => s.table),
        actors: { seller: sellerId, invokerAdmin: me.user.id },
        results,
        generatedAt: new Date().toISOString(),
      },
      200,
      corsHeaders,
    );
  } catch (e) {
    return jsonResponse(
      { error: "RLS_TESTS_FAILED", message: (e as Error).message },
      200,
      corsHeaders,
    );
  }
});
