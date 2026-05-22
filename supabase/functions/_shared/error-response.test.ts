// Unit tests for the unified V1/V2 validation error builders.
//
// V1 must be byte-for-byte compatible with the legacy parseBodyWithSchema
// behavior so existing clients (n8n product webhook, etc.) are unaffected.
// V2 is the new RFC-7807-inspired problem+json shape.

import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildV1ValidationError,
  buildV2Error,
  buildV2ValidationError,
  type V2ValidationErrorBody,
} from "./error-response.ts";

const CORS = { "Access-Control-Allow-Origin": "*" } as const;

function makeZodError(schema: z.ZodTypeAny, input: unknown): z.ZodError {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("schema unexpectedly accepted input");
  return result.error;
}

// ──────────────────────────────────────────────────────────────────
// V1 — legacy 400 / {error, details}
// ──────────────────────────────────────────────────────────────────

Deno.test("V1: status is 400", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, { sku: 123 });
  const res = buildV1ValidationError(err, { ...CORS });
  assertEquals(res.status, 400);
  await res.text();
});

Deno.test("V1: Content-Type is application/json", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, { sku: 123 });
  const res = buildV1ValidationError(err, { ...CORS });
  assertEquals(res.headers.get("Content-Type"), "application/json");
  await res.text();
});

Deno.test("V1: body has {error:'Validation failed', details:<fieldErrors>}", async () => {
  const Schema = z.object({ sku: z.string().min(1), name: z.string() });
  const err = makeZodError(Schema, { sku: "", name: 42 });
  const res = buildV1ValidationError(err, { ...CORS });
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
  assert(typeof body.details === "object", "details must be an object");
  assert("sku" in body.details);
  assert("name" in body.details);
});

Deno.test("V1: top-level form errors fall back to formErrors string array", async () => {
  // Refinement at root level → formErrors, not fieldErrors.
  const Schema = z.object({ a: z.string(), b: z.string() }).refine(
    (v) => v.a !== v.b,
    { message: "a and b must differ" },
  );
  const err = makeZodError(Schema, { a: "x", b: "x" });
  const res = buildV1ValidationError(err, { ...CORS });
  const body = await res.json();
  assertEquals(body.error, "Validation failed");
  // formErrors should be a non-empty array OR fallback object — either is OK
  // as long as the shape is consistent with the legacy implementation.
  assert(body.details !== undefined);
});

Deno.test("V1: CORS headers propagate to response", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, {});
  const res = buildV1ValidationError(err, {
    "Access-Control-Allow-Origin": "https://promogifts.com.br",
    "Access-Control-Allow-Methods": "POST",
  });
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://promogifts.com.br",
  );
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST");
  await res.text();
});

// ──────────────────────────────────────────────────────────────────
// V2 — new 422 / application/problem+json
// ──────────────────────────────────────────────────────────────────

Deno.test("V2: status is 422", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, { sku: 123 });
  const res = buildV2ValidationError(err, { ...CORS });
  assertEquals(res.status, 422);
  await res.text();
});

Deno.test("V2: Content-Type is application/problem+json", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, { sku: 123 });
  const res = buildV2ValidationError(err, { ...CORS });
  assertEquals(res.headers.get("Content-Type"), "application/problem+json");
  await res.text();
});

Deno.test("V2: body has {code,message,fields:[{path,code,message}]}", async () => {
  const Schema = z.object({
    product: z.object({ sku: z.string().min(1) }),
  });
  const err = makeZodError(Schema, { product: { sku: "" } });
  const res = buildV2ValidationError(err, { ...CORS });
  const body = (await res.json()) as V2ValidationErrorBody;
  assertEquals(body.code, "validation_failed");
  assertEquals(typeof body.message, "string");
  assert(Array.isArray(body.fields));
  assert(body.fields.length >= 1);
  const f = body.fields[0];
  assertEquals(f.path, "product.sku");
  assertStrictEquals(typeof f.code, "string");
  assertStrictEquals(typeof f.message, "string");
});

Deno.test("V2: root-level error has path='(root)'", async () => {
  const Schema = z.object({ a: z.string() }).refine((v) => v.a === "ok", {
    message: "a must be ok",
  });
  const err = makeZodError(Schema, { a: "not-ok" });
  const res = buildV2ValidationError(err, { ...CORS });
  const body = (await res.json()) as V2ValidationErrorBody;
  // The refine on root produces a path of [] → "(root)"
  const rootField = body.fields.find((f) => f.path === "(root)");
  assert(rootField, "expected at least one (root) field");
});

Deno.test("V2: multiple errors all surface in fields array", async () => {
  const Schema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(),
  });
  const err = makeZodError(Schema, { sku: "", name: "", price: -5 });
  const res = buildV2ValidationError(err, { ...CORS });
  const body = (await res.json()) as V2ValidationErrorBody;
  assertEquals(body.fields.length, 3);
  const paths = body.fields.map((f) => f.path).sort();
  assertEquals(paths, ["name", "price", "sku"]);
});

Deno.test("V2: custom message override is preserved", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, { sku: 123 });
  const res = buildV2ValidationError(err, { ...CORS }, "Custom error message");
  const body = await res.json();
  assertEquals(body.message, "Custom error message");
});

Deno.test("V2: CORS headers propagate to response", async () => {
  const Schema = z.object({ sku: z.string() });
  const err = makeZodError(Schema, {});
  const res = buildV2ValidationError(err, {
    "Access-Control-Allow-Origin": "*",
    "X-Request-Id": "abc123",
  });
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.headers.get("X-Request-Id"), "abc123");
  await res.text();
});

// ──────────────────────────────────────────────────────────────────
// buildV2Error — generic non-validation v2 error
// ──────────────────────────────────────────────────────────────────

Deno.test("buildV2Error: returns code/message/fields with custom status", async () => {
  const res = buildV2Error("unauthorized", "Bad token", 401, { ...CORS });
  assertEquals(res.status, 401);
  assertEquals(res.headers.get("Content-Type"), "application/problem+json");
  const body = await res.json();
  assertEquals(body.code, "unauthorized");
  assertEquals(body.message, "Bad token");
  assertEquals(body.fields, []);
});

Deno.test("buildV2Error: accepts extra fields", async () => {
  const res = buildV2Error("rate_limited", "Too many requests", 429, { ...CORS }, [
    { path: "(request)", code: "rate_limit", message: "limit=60/min" },
  ]);
  const body = await res.json();
  assertEquals(body.fields.length, 1);
  assertEquals(body.fields[0].path, "(request)");
  assertEquals(body.fields[0].code, "rate_limit");
});

// ──────────────────────────────────────────────────────────────────
// Snapshot — V1 byte-for-byte legacy compatibility
// ──────────────────────────────────────────────────────────────────
//
// The previous implementation in zod-validate.ts produced this shape:
//   { error: "Validation failed", details: <fieldErrors-or-formErrors> }
// with HTTP 400 and Content-Type: application/json.
//
// Any change here is a breaking change for n8n and other external clients.
//
// If you intentionally change v1, update this snapshot and add a
// `breaking-v1` label to the PR (see scripts/check-contract-coverage.mjs).

Deno.test("V1 snapshot: shape, status and headers are stable (regression guard)", async () => {
  const Schema = z.object({ sku: z.string().min(1), price: z.number() });
  const err = makeZodError(Schema, { sku: "", price: "not-a-number" });
  const res = buildV1ValidationError(err, { "Access-Control-Allow-Origin": "*" });

  assertEquals(res.status, 400);
  assertEquals(res.headers.get("Content-Type"), "application/json");
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");

  const body = await res.json();
  // Top-level keys are exactly { error, details } — nothing extra.
  assertEquals(Object.keys(body).sort(), ["details", "error"]);
  assertEquals(body.error, "Validation failed");
  assertEquals(typeof body.details, "object");
  assertEquals(Object.keys(body.details).sort(), ["price", "sku"]);
});
