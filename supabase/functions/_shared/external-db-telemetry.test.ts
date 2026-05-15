import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyErrorKind } from "./external-db-telemetry.ts";

Deno.test("classifyErrorKind: status ok/slow/very_slow → null", () => {
  assertEquals(classifyErrorKind("anything", "ok"), null);
  assertEquals(classifyErrorKind("anything", "slow"), null);
  assertEquals(classifyErrorKind("anything", "very_slow"), null);
});

Deno.test("classifyErrorKind: error sem mensagem → unknown", () => {
  assertEquals(classifyErrorKind(undefined, "error"), "unknown");
  assertEquals(classifyErrorKind("", "error"), "unknown");
});

Deno.test("classifyErrorKind: timeout (varias formas)", () => {
  assertEquals(classifyErrorKind("query timeout", "error"), "timeout");
  assertEquals(classifyErrorKind("statement timed out", "error"), "timeout");
  assertEquals(classifyErrorKind("ETIMEDOUT", "error"), "timeout");
  assertEquals(classifyErrorKind("canceling statement due to statement timeout (57014)", "error"), "timeout");
});

Deno.test("classifyErrorKind: rate_limit", () => {
  assertEquals(classifyErrorKind("Too Many Requests", "error"), "rate_limit");
  assertEquals(classifyErrorKind("HTTP 429 rate limit exceeded", "error"), "rate_limit");
});

Deno.test("classifyErrorKind: auth", () => {
  assertEquals(classifyErrorKind("JWT expired", "error"), "auth");
  assertEquals(classifyErrorKind("Unauthorized", "error"), "auth");
  assertEquals(classifyErrorKind("403 forbidden", "error"), "auth");
});

Deno.test("classifyErrorKind: validation", () => {
  assertEquals(classifyErrorKind("Zod validation failed", "error"), "validation");
  // 'invalid input' bate antes de 'syntax error' na ordem do classificador
  assertEquals(classifyErrorKind("invalid input syntax for type uuid", "error"), "validation");
  assertEquals(classifyErrorKind("zod validation error on body", "error"), "validation");
  assertEquals(classifyErrorKind("HTTP 400 invalid input", "error"), "validation");
  assertEquals(classifyErrorKind("HTTP 400 invalid input", "error"), "validation");
});

Deno.test("classifyErrorKind: postgrest_error", () => {
  assertEquals(classifyErrorKind("PGRST116 not found", "error"), "postgrest_error");
  assertEquals(classifyErrorKind("relation \"x\" does not exist", "error"), "postgrest_error");
});

Deno.test("classifyErrorKind: network", () => {
  assertEquals(classifyErrorKind("fetch failed", "error"), "network");
  assertEquals(classifyErrorKind("ECONNREFUSED", "error"), "network");
});

Deno.test("classifyErrorKind: fallback unknown", () => {
  assertEquals(classifyErrorKind("something weird happened", "error"), "unknown");
});
