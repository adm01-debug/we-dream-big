// Contract tests for webhook-dispatcher (v1 + v2).
//
// Schema-level focus: dispatcher has heavy DB / network side-effects after
// validation, so we exercise the validation layer in isolation through the
// exported handler. End-to-end behavior is covered by dispatcherAuth.test.ts
// and scripts/contract-testing.mjs (live mode).

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DispatchBodySchemaV1,
  DispatchBodySchemaV2,
} from "./schemas.ts";

// Test helper: disables Deno's sanitizers because @supabase/supabase-js
// (instantiated at module load) starts internal keep-alive timers.
function t(name: string, fn: () => unknown | Promise<unknown>) {
  Deno.test({
    name,
    sanitizeOps: false,
    sanitizeResources: false,
    sanitizeExit: false,
    fn: async () => {
      await fn();
    },
  });
}

Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321");
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "test-key",
);
// Don't set WEBHOOK_DISPATCHER_SECRET so the secret guard is skipped.
Deno.env.delete("WEBHOOK_DISPATCHER_SECRET");

const BASE = "https://stub.supabase.co/functions/v1/webhook-dispatcher";

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod.handler;
}

function makeReq(opts: {
  version?: "v1" | "v2";
  body?: unknown;
  rawBody?: string;
}): Request {
  const versionPath = opts.version === "v2" ? "/v2" : "";
  return new Request(`${BASE}${versionPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts.rawBody !== undefined ? opts.rawBody : JSON.stringify(opts.body ?? {}),
  });
}

// ──────────────────────────────────────────────────────────────────
// V1 schema (matches inline BodySchema pre-change)
// ──────────────────────────────────────────────────────────────────

t("[webhook-dispatcher v1 schema] missing event → invalid", () => {
  const r = DispatchBodySchemaV1.safeParse({});
  assertEquals(r.success, false);
  if (!r.success) {
    const paths = r.error.issues.map((i) => i.path.join("."));
    assert(paths.includes("event"));
  }
});

t("[webhook-dispatcher v1 schema] empty event → invalid", () => {
  const r = DispatchBodySchemaV1.safeParse({ event: "" });
  assertEquals(r.success, false);
});

t("[webhook-dispatcher v1 schema] event-only payload is valid", () => {
  const r = DispatchBodySchemaV1.safeParse({ event: "order.created" });
  assertEquals(r.success, true);
});

t("[webhook-dispatcher v1 schema] invalid uuid in test_webhook_id → invalid", () => {
  const r = DispatchBodySchemaV1.safeParse({
    event: "x",
    test_mode: true,
    test_webhook_id: "not-a-uuid",
  });
  assertEquals(r.success, false);
});

// ──────────────────────────────────────────────────────────────────
// V2 schema — adds correlation_id (required) + dispatch_options
// ──────────────────────────────────────────────────────────────────

t("[webhook-dispatcher v2 schema] missing correlation_id → invalid", () => {
  const r = DispatchBodySchemaV2.safeParse({ event: "x" });
  assertEquals(r.success, false);
  if (!r.success) {
    const paths = r.error.issues.map((i) => i.path.join("."));
    assert(paths.includes("correlation_id"));
  }
});

t("[webhook-dispatcher v2 schema] invalid uuid correlation_id → invalid", () => {
  const r = DispatchBodySchemaV2.safeParse({
    event: "x",
    correlation_id: "bogus",
  });
  assertEquals(r.success, false);
});

t("[webhook-dispatcher v2 schema] unknown top-level key (strict) → invalid", () => {
  const r = DispatchBodySchemaV2.safeParse({
    event: "x",
    correlation_id: "00000000-0000-4000-8000-000000000000",
    rogue: true,
  });
  assertEquals(r.success, false);
});

t("[webhook-dispatcher v2 schema] timeout_ms out of range → invalid", () => {
  const r = DispatchBodySchemaV2.safeParse({
    event: "x",
    correlation_id: "00000000-0000-4000-8000-000000000000",
    dispatch_options: { timeout_ms: 5 },
  });
  assertEquals(r.success, false);
});

t("[webhook-dispatcher v2 schema] timeout_ms way too high → invalid", () => {
  const r = DispatchBodySchemaV2.safeParse({
    event: "x",
    correlation_id: "00000000-0000-4000-8000-000000000000",
    dispatch_options: { timeout_ms: 999_999 },
  });
  assertEquals(r.success, false);
});

t("[webhook-dispatcher v2 schema] valid body → ok", () => {
  const r = DispatchBodySchemaV2.safeParse({
    event: "order.created",
    payload: { id: 1 },
    correlation_id: "00000000-0000-4000-8000-000000000000",
    dispatch_options: { parallel: true, timeout_ms: 5000 },
  });
  assertEquals(r.success, true);
});

// ──────────────────────────────────────────────────────────────────
// Handler end-to-end (skips DB by virtue of invalid auth/body)
// ──────────────────────────────────────────────────────────────────

t("[webhook-dispatcher v1] OPTIONS preflight → 2xx", async () => {
  const handler = await loadHandler();
  const res = await handler(new Request(BASE, { method: "OPTIONS" }));
  assert(res.status >= 200 && res.status < 300);
});

t("[webhook-dispatcher v1] empty body → 400/{error,details}", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({ body: {} }));
  assertEquals(res.status, 400);
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v1");
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
});

t("[webhook-dispatcher v2] missing correlation_id → 422/{code,message,fields}", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({ version: "v2", body: { event: "x" } }));
  assertEquals(res.status, 422);
  assertEquals(res.headers.get("Content-Type"), "application/problem+json");
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v2");
  const body = await res.json();
  assertEquals(body.code, "validation_failed");
  const cf = body.fields.find((f: { path: string }) => f.path === "correlation_id");
  assertExists(cf);
});

t("[webhook-dispatcher v2] unknown top-level key → 422", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({
    version: "v2",
    body: {
      event: "x",
      correlation_id: "00000000-0000-4000-8000-000000000000",
      something_extra: 1,
    },
  }));
  assertEquals(res.status, 422);
});

t("[webhook-dispatcher v2] empty body → 422", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({ version: "v2", rawBody: "" }));
  // dispatcher's body parse uses .catch(() => ({})) so empty body yields {} → schema validation fails → 422.
  assertEquals(res.status, 422);
});
