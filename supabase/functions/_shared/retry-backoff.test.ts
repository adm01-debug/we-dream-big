// supabase/functions/_shared/retry-backoff.test.ts
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isTransientError, nextDelayMs, retryWithBackoff } from "./retry-backoff.ts";

Deno.test("isTransientError detects statement timeout", () => {
  assert(isTransientError(new Error("canceling statement due to statement timeout")));
  assert(isTransientError(new Error("ECONNRESET while reading response")));
  assert(isTransientError(new Error("503 Service Unavailable")));
  assertEquals(isTransientError(new Error("permission denied for table foo")), false);
  assertEquals(isTransientError(new Error("violates not-null constraint")), false);
});

Deno.test("nextDelayMs stays within [base, cap] and grows with prev", () => {
  const base = 100, cap = 1500;
  for (let i = 0; i < 200; i++) {
    const d1 = nextDelayMs(base, base, cap);
    assert(d1 >= base && d1 <= cap, `d1 out of range: ${d1}`);
    const d2 = nextDelayMs(d1, base, cap);
    assert(d2 >= base && d2 <= cap, `d2 out of range: ${d2}`);
  }
});

Deno.test("retryWithBackoff succeeds after transient failures", async () => {
  let calls = 0;
  const result = await retryWithBackoff(async () => {
    calls++;
    if (calls < 3) throw new Error("statement timeout");
    return "ok";
  }, { baseMs: 1, capMs: 5, budgetMs: 1000, label: "test" });
  assertEquals(result.value, "ok");
  assertEquals(result.attempts, 3);
});

Deno.test("retryWithBackoff stops on non-transient error immediately", async () => {
  let calls = 0;
  await assertRejects(async () => {
    await retryWithBackoff(async () => {
      calls++;
      throw new Error("permission denied");
    }, { baseMs: 1, capMs: 5, budgetMs: 1000, maxAttempts: 5, label: "test" });
  });
  assertEquals(calls, 1, "should not retry non-transient errors");
});

Deno.test("retryWithBackoff respects budget", async () => {
  let calls = 0;
  const t0 = performance.now();
  await assertRejects(async () => {
    await retryWithBackoff(async () => {
      calls++;
      throw new Error("statement timeout");
    }, { baseMs: 50, capMs: 200, budgetMs: 120, maxAttempts: 10, label: "test" });
  });
  const elapsed = performance.now() - t0;
  assert(elapsed < 400, `should respect budget, took ${elapsed}ms`);
  assert(calls <= 4, `should bail early, did ${calls} attempts`);
});

Deno.test("retryWithBackoff respects maxAttempts", async () => {
  let calls = 0;
  await assertRejects(async () => {
    await retryWithBackoff(async () => {
      calls++;
      throw new Error("statement timeout");
    }, { baseMs: 1, capMs: 5, budgetMs: 5000, maxAttempts: 2, label: "test" });
  });
  assertEquals(calls, 2);
});
