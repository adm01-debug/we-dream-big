// Contract tests for product-webhook (v1 + v2) — pure unit-level (no network).
//
// Tests the EXPORTED `handler` from index.ts directly, so we exercise the full
// request pipeline (auth header, version dispatch, schema validation, error
// shape) WITHOUT spinning up the Deno server or hitting Supabase.
//
// Side-effects are isolated by:
//   - never providing a secret env (so auth is skipped for tests)
//   - building requests with a fake URL host
//   - the handler short-circuits with a validation error BEFORE touching
//     createClient when payloads are invalid, which covers the bulk of cases
//
// For tests that exercise the happy path we stub-set SUPABASE_URL/KEY to dummy
// values; the createClient call will succeed (just instantiates), and the
// subsequent insert RPC fails — we intercept by passing a stub via env
// (see __SUPABASE_STUB__ override). For a real green-on-DB run see
// scripts/contract-testing.mjs.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Test helper: disables Deno's sanitizers because @supabase/supabase-js
// (instantiated at module load via createClient) starts internal keep-alive
// timers we cannot control from tests.
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

// Ensure the env vars exist so the module top-level doesn't crash on import.
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321");
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "test-key",
);
// Explicitly unset the webhook secret so auth is bypassed in tests.
Deno.env.delete("N8N_PRODUCT_WEBHOOK_SECRET");

const FN_URL = "https://stub.supabase.co/functions/v1/product-webhook";

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod.handler;
}

function makeRequest(opts: {
  version?: "v1" | "v2";
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}): Request {
  const versionPath = opts.version === "v2" ? "/v2" : "";
  const url = `${FN_URL}${versionPath}`;
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.rawBody !== undefined
      ? opts.rawBody
      : JSON.stringify(opts.body ?? {}),
  });
}

// Valid v1 payload (matches what n8n sends today).
const validV1Body = {
  action: "upsert",
  product: { sku: "TEST-SKU-001", name: "Test Product", price: 10.5 },
};

// Valid v2 payload — adds idempotency_key + metadata.source.
const validV2Body = {
  action: "upsert",
  product: { sku: "TEST-SKU-001", name: "Test Product", price: 10.5 },
  idempotency_key: "test-idem-12345678",
  metadata: { source: "deno-test" },
};

// ──────────────────────────────────────────────────────────────────
// V1 contract — must remain byte-compat with n8n
// ──────────────────────────────────────────────────────────────────

t("[product-webhook v1] invalid action enum → 400 with {error, details}", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    body: { action: "bogus", product: { sku: "S", name: "N", price: 0 } },
  }));
  assertEquals(res.status, 400);
  assertEquals(res.headers.get("Content-Type"), "application/json");
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v1");
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
  assertExists(body.details);
  assertExists(body.details.action);
});

t("[product-webhook v1] missing required field 'price' → 400", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    body: { action: "upsert", product: { sku: "S", name: "N" } },
  }));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
});

t("[product-webhook v1] wrong type (price as string) → 400", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    body: { action: "upsert", product: { sku: "S", name: "N", price: "ten" } },
  }));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
});

t("[product-webhook v1] empty sku string → 400", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    body: { action: "upsert", product: { sku: "", name: "N", price: 1 } },
  }));
  assertEquals(res.status, 400);
});

t("[product-webhook v1] invalid JSON body → 400", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({ rawBody: "{not json" }));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid JSON in request body");
});

t("[product-webhook v1] empty body → 400", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({ rawBody: "" }));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Request body is required");
});

t("[product-webhook v1] CORS preflight OPTIONS → 2xx + ACL headers", async () => {
  const handler = await loadHandler();
  const res = await handler(new Request(FN_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://promogifts.com.br" },
  }));
  assert(res.status >= 200 && res.status < 300);
  assertExists(res.headers.get("Access-Control-Allow-Origin"));
});

t("[product-webhook v1] unauthorized when secret mismatch", async () => {
  Deno.env.set("N8N_PRODUCT_WEBHOOK_SECRET", "the-secret");
  try {
    const handler = await loadHandler();
    const res = await handler(makeRequest({
      body: validV1Body,
      headers: { "x-webhook-secret": "wrong" },
    }));
    assertEquals(res.status, 401);
    const body = await res.json();
    assertEquals(body.error, "Unauthorized");
  } finally {
    Deno.env.delete("N8N_PRODUCT_WEBHOOK_SECRET");
  }
});

// ──────────────────────────────────────────────────────────────────
// V2 contract — new 422 / problem+json
// ──────────────────────────────────────────────────────────────────

t("[product-webhook v2] invalid action enum → 422 with {code,message,fields}", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    version: "v2",
    body: { ...validV2Body, action: "bogus" },
  }));
  assertEquals(res.status, 422);
  assertEquals(res.headers.get("Content-Type"), "application/problem+json");
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v2");
  const body = await res.json();
  assertEquals(body.code, "validation_failed");
  assertEquals(typeof body.message, "string");
  assert(Array.isArray(body.fields));
  const actionField = body.fields.find((f: { path: string }) => f.path === "action");
  assertExists(actionField, "expected 'action' in fields[]");
});

t("[product-webhook v2] missing idempotency_key → 422", async () => {
  const handler = await loadHandler();
  const { idempotency_key: _omit, ...rest } = validV2Body;
  const res = await handler(makeRequest({ version: "v2", body: rest }));
  assertEquals(res.status, 422);
  const body = await res.json();
  const f = body.fields.find((x: { path: string }) => x.path === "idempotency_key");
  assertExists(f);
});

t("[product-webhook v2] missing metadata.source → 422 with path 'metadata.source'", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    version: "v2",
    body: { ...validV2Body, metadata: {} },
  }));
  assertEquals(res.status, 422);
  const body = await res.json();
  const f = body.fields.find((x: { path: string }) => x.path === "metadata.source");
  assertExists(f);
});

t("[product-webhook v2] wrong type (idempotency_key as number) → 422", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    version: "v2",
    body: { ...validV2Body, idempotency_key: 12345 },
  }));
  assertEquals(res.status, 422);
  const body = await res.json();
  const f = body.fields.find((x: { path: string }) => x.path === "idempotency_key");
  assertExists(f);
});

t("[product-webhook v2] empty idempotency_key → 422", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    version: "v2",
    body: { ...validV2Body, idempotency_key: "" },
  }));
  assertEquals(res.status, 422);
});

t("[product-webhook v2] unknown top-level key (strict mode) → 422", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({
    version: "v2",
    body: { ...validV2Body, unknown_field: "x" },
  }));
  assertEquals(res.status, 422);
});

t("[product-webhook v2] invalid JSON → 422 with code 'invalid_json'", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({ version: "v2", rawBody: "{not json" }));
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.code, "invalid_json");
});

t("[product-webhook v2] empty body → 422 with code 'empty_body'", async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest({ version: "v2", rawBody: "" }));
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.code, "empty_body");
});

// ──────────────────────────────────────────────────────────────────
// Cross-version: same invalid payload produces version-appropriate shape
// ──────────────────────────────────────────────────────────────────

t("[product-webhook cross] same bad payload: v1 yields 400/{error,details}, v2 yields 422/{code,message,fields}", async () => {
  const handler = await loadHandler();
  const badProduct = { action: "upsert", product: { sku: "S", name: "N" } }; // missing price

  const r1 = await handler(makeRequest({ body: badProduct }));
  assertEquals(r1.status, 400);
  const b1 = await r1.json();
  assertEquals(b1.error, "Validation failed");
  assertExists(b1.details);

  const r2 = await handler(makeRequest({
    version: "v2",
    body: {
      ...badProduct,
      idempotency_key: "abcd1234",
      metadata: { source: "test" },
    },
  }));
  assertEquals(r2.status, 422);
  const b2 = await r2.json();
  assertEquals(b2.code, "validation_failed");
  assert(Array.isArray(b2.fields));
});
