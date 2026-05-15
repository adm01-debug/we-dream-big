import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/crm-db-bridge`;

Deno.test("diag (GET ?op=diag) returns boot/runtime/isolate snapshot", async () => {
  const res = await fetch(`${FN_URL}?op=diag`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.ts === "number");
  assert(typeof body.warm === "boolean");

  // isolate
  assert(body.isolate, "isolate block missing");
  assert(typeof body.isolate.booted_at === "number");
  assert(typeof body.isolate.age_ms === "number" && body.isolate.age_ms >= 0);
  assert(typeof body.isolate.request_count === "number");
  assert(typeof body.isolate.cold_request_count === "number");

  // boot
  assert(body.boot, "boot block missing");
  // client_build_ms / warmup_ms podem ser null se boot ainda não terminou
  assert(body.boot.client_build_ms === null || typeof body.boot.client_build_ms === "number");
  assert(body.boot.warmup_ms === null || typeof body.boot.warmup_ms === "number");
  assert(typeof body.boot.warmup_ok === "boolean");

  // runtime
  assert(body.runtime, "runtime block missing");
  assert(body.runtime.first_request_ms === null || typeof body.runtime.first_request_ms === "number");
});

Deno.test("diag (POST { operation: 'diag' }) returns same snapshot shape", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ operation: "diag" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(body.boot && body.runtime && body.isolate);
});
