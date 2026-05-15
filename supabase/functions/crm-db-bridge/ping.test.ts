import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/crm-db-bridge`;

Deno.test("ping (GET ?op=ping) bypasses auth and returns ok/ts/warm", async () => {
  const res = await fetch(`${FN_URL}?op=ping`, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.ts === "number" && body.ts > 0, "ts must be positive number");
  assert(typeof body.warm === "boolean", "warm must be boolean");
});

Deno.test("ping (POST { operation: 'ping' }) bypasses auth and returns ok/ts/warm", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ operation: "ping" }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.ts === "number" && body.ts > 0);
  assert(typeof body.warm === "boolean");
});

Deno.test("non-ping POST without auth is rejected (proves ping bypass is scoped)", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ operation: "select", table: "companies" }),
  });
  const body = await res.json();
  // 401 (auth) ou 403 (bot-protection) — ambos provam que o bypass é exclusivo do ping.
  assert(res.status === 401 || res.status === 403, `expected 401|403, got ${res.status}`);
  assert(typeof body.error === "string");
});
