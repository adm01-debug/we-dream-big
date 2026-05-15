import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/crm-db-bridge`;

Deno.test("breaker_status (GET ?op=breaker_status) returns flat shape", async () => {
  const res = await fetch(`${FN_URL}?op=breaker_status`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.ts === "number");

  // Flat fields requested by the panel
  assert(["CLOSED", "OPEN", "HALF_OPEN", "UNKNOWN"].includes(body.state), `unexpected state: ${body.state}`);
  assert(typeof body.failures === "number" && body.failures >= 0);
  assert(typeof body.openedAt === "number");
  assert(body.willResetAt === null || typeof body.willResetAt === "number");

  // Full breaker block
  assert(body.breaker, "breaker block missing");
  assertEquals(body.breaker.name, "crm-db");
  assert(typeof body.breaker.failureThreshold === "number");
  assert(typeof body.breaker.windowMs === "number");
  assert(typeof body.breaker.openDurationMs === "number");

  // All breakers
  assert(Array.isArray(body.all));
  assert(body.all.length >= 1);
});

Deno.test("breaker_status (POST { operation: 'breaker_status' }) bypasses auth", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ operation: "breaker_status" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.breaker.name, "crm-db");
});
