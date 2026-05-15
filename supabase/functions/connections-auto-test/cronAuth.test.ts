// Tests for the CONNECTIONS_AUTO_TEST_SECRET auth guard added in this PR.
//
// The guard lives at the top of Deno.serve() in index.ts. Because importing
// index.ts triggers Deno.serve() as a side-effect (which is fine for the
// runtime but inconvenient for unit-tests), we re-implement the guard logic
// inline here — exactly as done in assertServiceClient.test.ts for the
// service-client guard. If the auth logic in index.ts changes, this file must
// be kept in sync.
//
// Guard behaviour (current implementation):
//   1. undefined → no secret configured, guard disabled (local dev / CI without secrets).
//   2. ""        → misconfiguration detected, returns 500 Server misconfigured (fail-closed).
//   3. <string> AND x-cron-secret header absent or wrong → 401 Unauthorized.
//   4. <string> AND x-cron-secret header matches exactly → auth passes.

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Inline re-implementation of the auth guard (mirrors index.ts lines 122-132)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthResult {
  unauthorized: boolean;
  response: Response | null;
}

/**
 * Applies the cron-secret auth guard.
 * Returns { unauthorized: false, response: null } when the request is allowed,
 * or { unauthorized: true, response: <401 Response> } when it is rejected.
 */
function applyCronAuth(
  req: Request,
  cronSecret: string | undefined,
  corsHeaders: Record<string, string> = {},
): AuthResult {
  if (cronSecret !== undefined) {
    if (cronSecret.length === 0) {
      return {
        unauthorized: true,
        response: new Response(JSON.stringify({ error: "Server misconfigured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    const provided = req.headers.get("x-cron-secret");
    if (!provided || provided !== cronSecret) {
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
  return new Request("https://example.com/connections-auto-test", {
    method: "POST",
    headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Case 1: No secret configured → auth is skipped
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("cronAuth: no secret configured → request is allowed (no header)", () => {
  const result = applyCronAuth(makeRequest(), undefined);
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("cronAuth: no secret configured → request is allowed (with header)", () => {
  const result = applyCronAuth(makeRequest({ "x-cron-secret": "some-value" }), undefined);
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("cronAuth: empty string secret → 500 Server misconfigured (fail-closed)", async () => {
  // An empty env var is a misconfiguration: fail closed rather than silently disabling auth.
  const result = applyCronAuth(makeRequest(), "");
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 500);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Server misconfigured");
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 2 & 3: Secret configured, header absent or wrong → 401
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("cronAuth: secret set, header absent → 401 Unauthorized", async () => {
  const result = applyCronAuth(makeRequest(), "super-secret");
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Unauthorized");
});

Deno.test("cronAuth: secret set, wrong header value → 401 Unauthorized", async () => {
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "wrong-value" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
  const body = await result.response!.json() as { error: string };
  assertEquals(body.error, "Unauthorized");
});

Deno.test("cronAuth: secret set, empty header value → 401 Unauthorized", async () => {
  // An empty header is present but does not match any non-empty secret.
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, true);
  assertExists(result.response);
  assertEquals(result.response!.status, 401);
});

Deno.test("cronAuth: secret set, header is a prefix of the secret → 401", async () => {
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "super" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

Deno.test("cronAuth: secret set, header is the secret with extra chars → 401", async () => {
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "super-secret-extra" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 4: Secret configured, header matches exactly → auth passes
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("cronAuth: secret set, correct header → auth passes (no 401)", () => {
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "super-secret" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

Deno.test("cronAuth: secret set, correct header with special chars → auth passes", () => {
  const secret = "tok3n!@#$%^&*()_+-=[]{}|;':\",./<>?";
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": secret }),
    secret,
  );
  assertEquals(result.unauthorized, false);
  assertEquals(result.response, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// Response shape tests
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("cronAuth: 401 response includes Content-Type: application/json", async () => {
  const result = applyCronAuth(makeRequest(), "some-secret");
  assertExists(result.response);
  assertEquals(result.response!.headers.get("Content-Type"), "application/json");
});

Deno.test("cronAuth: 401 response body is valid JSON with error field", async () => {
  const result = applyCronAuth(makeRequest(), "some-secret");
  assertExists(result.response);
  const body = await result.response!.json() as { error: string };
  assertEquals(typeof body.error, "string");
  assertEquals(body.error.length > 0, true);
});

Deno.test("cronAuth: CORS headers are forwarded into the 401 response", async () => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://app.example.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const result = applyCronAuth(makeRequest(), "some-secret", corsHeaders);
  assertExists(result.response);
  assertEquals(
    result.response!.headers.get("Access-Control-Allow-Origin"),
    "https://app.example.com",
  );
  assertEquals(
    result.response!.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Comparison is strict (no timing-safe shortcut expected at this layer)
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("cronAuth: header comparison is exact — uppercase variant rejected", async () => {
  // The guard uses ===, so "SUPER-SECRET" !== "super-secret"
  const result = applyCronAuth(
    makeRequest({ "x-cron-secret": "SUPER-SECRET" }),
    "super-secret",
  );
  assertEquals(result.unauthorized, true);
  assertEquals(result.response!.status, 401);
});