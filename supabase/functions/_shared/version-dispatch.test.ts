// Unit tests for path-based contract version dispatch.

import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  resolveVersion,
  stripVersionFromPath,
  VERSION_SERVED_HEADER,
  withVersionHeader,
} from "./version-dispatch.ts";

function makeReq(url: string): Request {
  return new Request(url, { method: "POST" });
}

// ──────────────────────────────────────────────────────────────────
// resolveVersion — path based
// ──────────────────────────────────────────────────────────────────

Deno.test("resolveVersion: no version segment → v1 (default)", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook")),
    "v1",
  );
});

Deno.test("resolveVersion: explicit /v1 suffix → v1", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/v1")),
    "v1",
  );
});

Deno.test("resolveVersion: explicit /v2 suffix → v2", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/v2")),
    "v2",
  );
});

Deno.test("resolveVersion: /v2/ with trailing path → v2", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/v2/extra")),
    "v2",
  );
});

Deno.test("resolveVersion: uppercase /V2 → v2 (case-insensitive)", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/V2")),
    "v2",
  );
});

Deno.test("resolveVersion: unknown /v3 segment → v1 (default)", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/v3")),
    "v1",
  );
});

// ──────────────────────────────────────────────────────────────────
// resolveVersion — query fallback
// ──────────────────────────────────────────────────────────────────

Deno.test("resolveVersion: ?_v=2 query fallback → v2", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook?_v=2")),
    "v2",
  );
});

Deno.test("resolveVersion: ?_v=v2 query fallback → v2", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook?_v=v2")),
    "v2",
  );
});

Deno.test("resolveVersion: ?_v=1 query → v1", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook?_v=1")),
    "v1",
  );
});

Deno.test("resolveVersion: garbage ?_v=bogus → v1 (default)", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook?_v=bogus")),
    "v1",
  );
});

Deno.test("resolveVersion: path /v2 wins over ?_v=1 (path is canonical)", () => {
  assertStrictEquals(
    resolveVersion(makeReq("https://x.supabase.co/functions/v1/product-webhook/v2?_v=1")),
    "v2",
  );
});

// ──────────────────────────────────────────────────────────────────
// stripVersionFromPath
// ──────────────────────────────────────────────────────────────────

Deno.test("stripVersionFromPath: removes /v2 contract suffix, keeps /functions/v1 mount prefix", () => {
  assertEquals(
    stripVersionFromPath("/functions/v1/product-webhook/v2"),
    "/functions/v1/product-webhook",
  );
});

Deno.test("stripVersionFromPath: removes /v1 contract suffix, keeps /functions/v1 mount prefix", () => {
  assertEquals(
    stripVersionFromPath("/functions/v1/webhook-inbound/v1"),
    "/functions/v1/webhook-inbound",
  );
});

Deno.test("stripVersionFromPath: removes only the contract /v2 segment, even with trailing path", () => {
  assertEquals(
    stripVersionFromPath("/functions/v1/product-webhook/v2/extra"),
    "/functions/v1/product-webhook/extra",
  );
});

Deno.test("stripVersionFromPath: no contract version → unchanged (preserves /functions/v1)", () => {
  assertEquals(
    stripVersionFromPath("/functions/v1/product-webhook"),
    "/functions/v1/product-webhook",
  );
});

// ──────────────────────────────────────────────────────────────────
// withVersionHeader
// ──────────────────────────────────────────────────────────────────

Deno.test("withVersionHeader: attaches X-Contract-Version-Served", () => {
  const out = withVersionHeader({ "Content-Type": "application/json" }, "v2");
  assertEquals(out["Content-Type"], "application/json");
  assertEquals(out[VERSION_SERVED_HEADER], "v2");
});

Deno.test("withVersionHeader: does not mutate input", () => {
  const input: Record<string, string> = { "Content-Type": "application/json" };
  const out = withVersionHeader(input, "v1");
  // input untouched
  assertEquals(input[VERSION_SERVED_HEADER], undefined);
  // out has the header
  assertEquals(out[VERSION_SERVED_HEADER], "v1");
});

// ──────────────────────────────────────────────────────────────────
// Edge: invalid URL must not throw
// ──────────────────────────────────────────────────────────────────

Deno.test("resolveVersion: malformed URL → v1 (does not throw)", () => {
  // Request() with relative URL would throw, so we construct a Request and
  // then mutate the prototype to simulate. Instead use a special invalid URL
  // shape — the function catches via try/catch.
  const r = new Request("https://valid.example.com/", { method: "POST" });
  // Override the url getter to return an obviously broken string.
  Object.defineProperty(r, "url", { value: "not a url at all", configurable: true });
  assertStrictEquals(resolveVersion(r), "v1");
});
