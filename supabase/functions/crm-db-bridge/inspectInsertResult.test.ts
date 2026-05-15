import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { inspectInsertResult, logInsertResultIfAnomalous } from "./index.ts";

Deno.test("inspectInsertResult: normal rows array → shape=rows", () => {
  const d = inspectInsertResult([{ id: "a" }, { id: "b" }]);
  assertEquals(d.shape, "rows");
  assertEquals(d.rowCount, 2);
});

Deno.test("inspectInsertResult: empty array → shape=empty-array", () => {
  const d = inspectInsertResult([]);
  assertEquals(d.shape, "empty-array");
  assertEquals(d.rowCount, 0);
});

Deno.test("inspectInsertResult: null → shape=null", () => {
  const d = inspectInsertResult(null);
  assertEquals(d.shape, "null");
});

Deno.test("inspectInsertResult: GenericStringError as bare object", () => {
  const d = inspectInsertResult({ error: true, message: "column 'foo' does not exist" });
  assertEquals(d.shape, "generic-string-error");
  assertEquals(d.errorMessage, "column 'foo' does not exist");
});

Deno.test("inspectInsertResult: GenericStringError wrapped in array", () => {
  const d = inspectInsertResult([{ error: true, message: "permission denied" }]);
  assertEquals(d.shape, "generic-string-error");
  assertEquals(d.errorMessage, "permission denied");
  assertEquals(d.rowCount, 1);
});

Deno.test("inspectInsertResult: single-object (e.g. .single())", () => {
  const d = inspectInsertResult({ id: "x", name: "n" });
  assertEquals(d.shape, "single-object");
  assertEquals(d.rowCount, 1);
});

Deno.test("inspectInsertResult: primitive payload", () => {
  assertEquals(inspectInsertResult("oops").shape, "primitive");
  assertEquals(inspectInsertResult(42).shape, "primitive");
});

Deno.test("inspectInsertResult: preview is truncated for huge payloads", () => {
  const big = Array.from({ length: 1000 }, (_, i) => ({ id: i, big: "x".repeat(50) }));
  const d = inspectInsertResult(big);
  assert(d.preview.endsWith("…"), "preview should be truncated with ellipsis");
});

Deno.test("logInsertResultIfAnomalous: returns false for rows", () => {
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    const r = logInsertResultIfAnomalous(
      { callSite: "handleInsert", table: "quotes", operation: "insert" },
      inspectInsertResult([{ id: "ok" }]),
    );
    assertEquals(r, false);
    assertEquals(logs.length, 0);
  } finally {
    console.error = orig;
  }
});

Deno.test("logInsertResultIfAnomalous: emits structured log for GenericStringError", () => {
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    const r = logInsertResultIfAnomalous(
      { callSite: "handleInsert", table: "quotes", operation: "insert", returning: "id" },
      inspectInsertResult([{ error: true, message: "boom" }]),
    );
    assertEquals(r, true);
    assertEquals(logs.length, 1);
    const line = logs[0];
    assert(line.includes("result-shape-anomaly"), "should include event name");
    assert(line.includes("op=insert"), "should include op");
    assert(line.includes("table=quotes"), "should include table");
    assert(line.includes("shape=generic-string-error"), "should include shape");
    assert(line.includes('message="boom"'), "should include error message");
    assert(line.includes('"event":"result-shape-anomaly"'), "should include JSON payload");
  } finally {
    console.error = orig;
  }
});

Deno.test("logInsertResultIfAnomalous: emits log for empty-array as well", () => {
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    const r = logInsertResultIfAnomalous(
      { callSite: "handleUpdate", table: "companies", operation: "update" },
      inspectInsertResult([]),
    );
    assertEquals(r, true);
    assert(logs[0].includes("shape=empty-array"));
  } finally {
    console.error = orig;
  }
});
