// Tests for the WEBHOOK_DISPATCHER_SECRET auth guard added in this PR.
//
// The guard lives at the top of Deno.serve() in index.ts. Because importing
// index.ts triggers Deno.serve() as a side-effect (which is fine for the
// runtime but inconvenient for unit-tests), we re-implement the guard logic
// inline here — the same pattern used by
// connections-auto-test/assertServiceClient.test.ts. If the auth logic in
// index.ts changes, this file must be kept in sync.
//
// Guard behaviour (current implementation):
//   1. undefined → no secret configured, guard disabled (local dev / CI without secrets).
//   2. ""        → misconfiguration detected, returns 500 Server misconfigured (fail-closed).
//   3. <string> AND x-dispatcher-secret header absent or wrong → 401 Unauthorized.
//   4. <string> AND x-dispatcher-secret header matches exactly → auth passes.

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Inline re-implementation of the auth guard (mirrors index.ts lines 45-55)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthResult {
  unauthorized: boolean;
  response: Response | null;
}

/**
 * Applies the dispatcher-secret auth guard.
 * Returns { unauthorized: false, response: null } when the request is allowed,
 * or { unauthorized: true, response: <401 Response> } when it is rejected.
 */
function applyDispatcherAuth(
  req: Request,
  dispatcherSecret: string | undefined,
  corsHeaders: Record<string, string> = {},
): AuthResult {
  if (dispatcherSecret !== undefined) {
    if (dispatcherSecret.length === 0) {
      return {
        unauthorized: true,
        response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    const provided = req.headers.get("x-dispatcher-secret");
    if (!provided || provided !== dispatcherSecret) {
      return {
        unauthorized: true,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
  }
  return { unauthorized: false, response: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/webhook-dispatcher", {
    method: "POST",
    headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Case 1: No secret configured → auth is skipped
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("dispatcherAuth: no secret configured → request allowed (no header)", () => {
  const result = applyDispatcherAuth(makeRequest(), undefined);
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("dispatcherAuth: no secret configured → request allowed (with header)", () => {
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "any-value" }),
    undefined,
  );
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("dispatcherAuth: empty string secret → 500 Server misconfigured (fail-closed)", async () => {
  // An empty env var is a misconfiguration: fail closed rather than silently disabling auth.
  const result = applyDispatcherAuth(makeRequest(), "");
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 500);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Server misconfigured");
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 2 & 3: Secret configured, header absent or wrong → 401
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("dispatcherAuth: secret set, header absent → 401 Unauthorized", async () => {
  const result = applyDispatcherAuth(makeRequest(), "dispatcher-secret");
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Unauthorized");
});

Deno.test("dispatcherAuth: secret set, wrong header value → 401 Unauthorized", async () => {
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "wrong-value" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Unauthorized");
});

Deno.test("dispatcherAuth: secret set, empty header value → 401 Unauthorized", async () => {
  // Empty string is present but falsy-checked before equality comparison.
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
});

Deno.test("dispatcherAuth: secret set, header is a prefix of the secret → 401", async () => {
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "dispatcher" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

Deno.test("dispatcherAuth: secret set, header has extra chars beyond the secret → 401", async () => {
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "dispatcher-secret-extra" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 4: Secret configured, header matches exactly → auth passes
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("dispatcherAuth: secret set, correct header → auth passes (no 401)", () => {
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "dispatcher-secret" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("dispatcherAuth: secret set, correct header with special chars → auth passes", () => {
  const secret = "tok3n!@#$%^&*()_+-=[]{}|;':\",./<>?";
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": secret }),
    secret,
  );
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// Response shape tests
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("dispatcherAuth: 401 response includes Content-Type: application/json", () => {
  const result = applyDispatcherAuth(makeRequest(), "some-secret");
  assertExists(result.response);
  assertEquals(result.response!.headers.get("Content-Type"), "application/json");
});

Deno.test("dispatcherAuth: 401 response body is valid JSON with error field", async () => {
  const result = applyDispatcherAuth(makeRequest(), "some-secret");
  assertExists(result.response);
  const body = await result.response!.json() as { error: string };
  assertEquals(typeof body.error, "string");
  assertEquals(body.error.length > 0, true);
});

Deno.test("dispatcherAuth: CORS headers are forwarded into the 401 response", () => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const result = applyDispatcherAuth(makeRequest(), "some-secret", corsHeaders);
  assertExists(result.response);
  assertEquals(result.response!.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(
    result.response!.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression / boundary cases
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("dispatcherAuth: comparison is case-sensitive — uppercase variant rejected", () => {
  // The guard uses ===, so "DISPATCHER-SECRET" !== "dispatcher-secret"
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "DISPATCHER-SECRET" }),
    "dispatcher-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

Deno.test("dispatcherAuth: secret set with only whitespace — empty header rejected", async () => {
  // A secret that is only spaces is still truthy; a blank header is falsy.
  const result = applyDispatcherAuth(
    makeRequest({ "x-dispatcher-secret": "" }),
    "   ",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

Deno.test("dispatcherAuth: OPTIONS method is unrelated to auth guard (guard is method-agnostic)", () => {
  // The OPTIONS preflight is handled BEFORE the auth guard in index.ts.
  // This test documents that the guard itself does NOT short-circuit for OPTIONS —
  // that responsibility belongs to the caller.
  const optionsReq = new Request("https://example.com/webhook-dispatcher", {
    method: "OPTIONS",
    headers: {},
  });
  const result = applyDispatcherAuth(optionsReq, "some-secret");
  // Guard sees no header → still returns unauthorized
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});