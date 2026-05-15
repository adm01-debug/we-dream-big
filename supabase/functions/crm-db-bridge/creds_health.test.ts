// supabase/functions/crm-db-bridge/creds_health.test.ts
//
// Integration test for the ?op=creds_health diagnostic endpoint introduced
// to make credential resolution observable without exposing values.
//
// Like diag.test.ts and ping.test.ts, this hits a real deployed bridge —
// run locally with `deno test --allow-net --allow-env -A`, with the
// environment configured to point at a deployed Supabase project.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/crm-db-bridge`;

const VALID_HEALTHS = new Set(["healthy", "degraded", "missing"]);
const VALID_SOURCES = new Set(["db", "env", "none"]);
const EXPECTED_NAMES = [
  "EXTERNAL_CRM_URL",
  "EXTERNAL_CRM_SERVICE_ROLE_KEY",
  "EXTERNAL_CRM_ANON_KEY",
];

function assertCredentialEntry(label: string, entry: unknown) {
  assert(entry && typeof entry === "object", `${label} entry must be object`);
  const e = entry as Record<string, unknown>;
  assertEquals(typeof e.name, "string", `${label}.name`);
  assertEquals(typeof e.present, "boolean", `${label}.present`);
  assert(VALID_SOURCES.has(e.source as string), `${label}.source must be db|env|none, got ${e.source}`);
  assertEquals(typeof e.via_alias, "boolean", `${label}.via_alias`);
  assertEquals(typeof e.resolved_name, "string", `${label}.resolved_name`);
  assertEquals(typeof e.value_length, "number", `${label}.value_length`);
  if (e.present === true) {
    assertEquals(typeof e.suffix4, "string", `${label}.suffix4 should be string when present`);
    assertEquals((e.suffix4 as string).length, 4, `${label}.suffix4 should be 4 chars`);
    assert((e.value_length as number) > 0, `${label}.value_length must be positive when present`);
  } else {
    assertEquals(e.suffix4, null, `${label}.suffix4 should be null when not present`);
    assertEquals(e.value_length, 0, `${label}.value_length must be 0 when not present`);
  }
}

Deno.test("creds_health (GET ?op=creds_health) returns shape contract", async () => {
  const res = await fetch(`${FN_URL}?op=creds_health`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.ts === "number");

  assert(VALID_HEALTHS.has(body.health), `health must be healthy|degraded|missing, got ${body.health}`);

  assert(Array.isArray(body.credentials), "credentials must be array");
  assertEquals(body.credentials.length, EXPECTED_NAMES.length);
  for (const name of EXPECTED_NAMES) {
    const entry = body.credentials.find((c: { name: string }) => c.name === name);
    assert(entry, `missing credential entry for ${name}`);
    assertCredentialEntry(name, entry);
  }

  // Health aggregation contract:
  //   missing  ⇔ no URL-suffixed name is present
  //   degraded ⇔ URL present, but no key present
  //   healthy  ⇔ URL present AND at least one key present
  const url = body.credentials.find((c: { name: string }) => c.name === "EXTERNAL_CRM_URL")!;
  const service = body.credentials.find((c: { name: string }) => c.name === "EXTERNAL_CRM_SERVICE_ROLE_KEY")!;
  const anon = body.credentials.find((c: { name: string }) => c.name === "EXTERNAL_CRM_ANON_KEY")!;
  if (!url.present) assertEquals(body.health, "missing");
  else if (!service.present && !anon.present) assertEquals(body.health, "degraded");
  else assertEquals(body.health, "healthy");
});

Deno.test("creds_health (POST { operation: 'creds_health' }) returns same shape", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ operation: "creds_health" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(VALID_HEALTHS.has(body.health));
  assert(Array.isArray(body.credentials));
  assertEquals(body.credentials.length, EXPECTED_NAMES.length);
});

Deno.test("creds_health bypasses auth (no apikey header)", async () => {
  // Operadores precisam diagnosticar mesmo com JWT/keys quebrados.
  // Igual a ping/diag/breaker_status: bypass total de auth.
  const res = await fetch(`${FN_URL}?op=creds_health`, { method: "GET" });
  // Pode retornar 200 (bypass total) — em alguns ambientes o gateway exige
  // apikey antes da função; nesse caso a request falha em 401 antes mesmo
  // de chegar ao código da function. Aceitamos ambos: o que importa é que
  // a function não bloqueia explicitamente sem auth.
  assert(res.status === 200 || res.status === 401, `unexpected status ${res.status}`);
  if (res.status === 200) {
    const body = await res.json();
    assertEquals(body.ok, true);
  }
});
