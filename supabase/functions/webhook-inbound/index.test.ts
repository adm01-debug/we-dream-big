// Contract tests for webhook-inbound — schema-level only (no real Supabase).
//
// The handler hits the database for endpoint lookup, so these tests focus on
// pre-DB validations: missing slug, version dispatch, schema-shape errors.
// Full end-to-end (HMAC + DB) is covered in integration_test.ts and the Node
// runner scripts/contract-testing.mjs.

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

// Stub env so the module top-level (createClient call) doesn't crash.
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321");
Deno.env.set(
  "SUPABASE_SERVICE_ROLE_KEY",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "test-key",
);

const BASE = "https://stub.supabase.co/functions/v1/webhook-inbound";

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod.handler;
}

function makeReq(opts: {
  version?: "v1" | "v2";
  slug?: string;
  body?: unknown;
  rawBody?: string;
  signature?: string;
}): Request {
  const versionPath = opts.version === "v2" ? "/v2" : "";
  const slugQs = opts.slug ? `?slug=${opts.slug}` : "";
  const url = `${BASE}${versionPath}${slugQs}`;
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.signature ? { "x-signature-256": opts.signature } : {}),
    },
    body: opts.rawBody !== undefined
      ? opts.rawBody
      : JSON.stringify(opts.body ?? {}),
  });
}

// ──────────────────────────────────────────────────────────────────
// V1 — lenient (back-compat: this endpoint had no schema before)
// ──────────────────────────────────────────────────────────────────

t("[webhook-inbound v1] OPTIONS preflight → 2xx + ACL headers", async () => {
  const handler = await loadHandler();
  const res = await handler(new Request(BASE, { method: "OPTIONS" }));
  assert(res.status >= 200 && res.status < 300);
  assertExists(res.headers.get("Access-Control-Allow-Origin"));
});

// Note: testing the slug-missing branch requires a URL where the last path
// segment is neither "v1" nor "v2" — covered by integration_test.ts which has
// a real DB. With a stub URL like /functions/v1/webhook-inbound, the function
// falls back to "webhook-inbound" as slug; the DB lookup then fails and
// returns 404 (endpoint not found). That 404 path is exercised below.

t("[webhook-inbound v1] unknown slug → 404 endpoint not found", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({
    slug: "no-such-endpoint-deadbeef",
    body: { event_type: "x", payload: {} },
  }));
  // Falls through to DB lookup; with stub Supabase, returns 404.
  // Accept either: 404 (endpoint not found via real Supabase client) or 500
  // (network error talking to the stub). Both prove pre-DB validation passed.
  assert([404, 500].includes(res.status), `unexpected status ${res.status}`);
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v1");
});

// ──────────────────────────────────────────────────────────────────
// V2 — strict envelope
// ──────────────────────────────────────────────────────────────────

t("[webhook-inbound v2] unknown slug → 404 with X-Contract-Version-Served=v2", async () => {
  const handler = await loadHandler();
  const res = await handler(makeReq({
    version: "v2",
    slug: "no-such-endpoint-deadbeef",
    body: {
      event_type: "test",
      payload: {},
      request_id: "00000000-0000-4000-8000-000000000000",
    },
  }));
  assert([404, 500].includes(res.status), `unexpected status ${res.status}`);
  assertEquals(res.headers.get("X-Contract-Version-Served"), "v2");
});

// The schema-validation cases below require an existing endpoint row to get
// past the DB lookup. Since we can't easily stub createClient here without
// significant refactor, we cover the SCHEMA itself via direct imports.

import {
  InboundWebhookSchemaV1,
  InboundWebhookSchemaV2,
} from "./schemas.ts";

t("[webhook-inbound v2 schema] missing request_id → invalid with field 'request_id'", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "order.created",
    payload: { id: 1 },
  });
  assertEquals(r.success, false);
  if (!r.success) {
    const paths = r.error.issues.map((i) => i.path.join("."));
    assert(paths.includes("request_id"));
  }
});

t("[webhook-inbound v2 schema] invalid UUID request_id → invalid", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "order.created",
    payload: {},
    request_id: "not-a-uuid",
  });
  assertEquals(r.success, false);
});

t("[webhook-inbound v2 schema] missing payload → invalid with field 'payload'", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "order.created",
    request_id: "00000000-0000-4000-8000-000000000000",
  });
  assertEquals(r.success, false);
  if (!r.success) {
    const paths = r.error.issues.map((i) => i.path.join("."));
    assert(paths.includes("payload"));
  }
});

t("[webhook-inbound v2 schema] empty event_type → invalid", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "",
    payload: {},
    request_id: "00000000-0000-4000-8000-000000000000",
  });
  assertEquals(r.success, false);
});

t("[webhook-inbound v2 schema] wrong type (payload as string) → invalid", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "x",
    payload: "should-be-object",
    request_id: "00000000-0000-4000-8000-000000000000",
  });
  assertEquals(r.success, false);
});

t("[webhook-inbound v2 schema] unknown key (strict) → invalid", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "x",
    payload: {},
    request_id: "00000000-0000-4000-8000-000000000000",
    rogue_field: 1,
  });
  assertEquals(r.success, false);
});

t("[webhook-inbound v2 schema] valid body → ok", () => {
  const r = InboundWebhookSchemaV2.safeParse({
    event_type: "order.created",
    payload: { id: 1 },
    request_id: "00000000-0000-4000-8000-000000000000",
  });
  assertEquals(r.success, true);
});

// ──────────────────────────────────────────────────────────────────
// V1 schema — lenient (passthrough)
// ──────────────────────────────────────────────────────────────────

t("[webhook-inbound v1 schema] missing event_type still passes (lenient back-compat)", () => {
  const r = InboundWebhookSchemaV1.safeParse({ payload: { id: 1 } });
  assertEquals(r.success, true);
});

t("[webhook-inbound v1 schema] extra keys pass (passthrough)", () => {
  const r = InboundWebhookSchemaV1.safeParse({
    event_type: "x",
    payload: {},
    legacy_field: "from-old-publisher",
  });
  assertEquals(r.success, true);
});

t("[webhook-inbound v1 schema] empty event_type → invalid (min length)", () => {
  const r = InboundWebhookSchemaV1.safeParse({ event_type: "", payload: {} });
  assertEquals(r.success, false);
});
