import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { firstRowAsRecord, toRecord } from "./index.ts";

Deno.test("toRecord: returns null for null/undefined/primitives/arrays", () => {
  assertEquals(toRecord(null), null);
  assertEquals(toRecord(undefined), null);
  assertEquals(toRecord(42), null);
  assertEquals(toRecord("hello"), null);
  assertEquals(toRecord(true), null);
  assertEquals(toRecord([1, 2, 3]), null);
});

Deno.test("toRecord: returns null for GenericStringError-like payload", () => {
  const ge = { error: true, message: "column does not exist" };
  assertEquals(toRecord(ge), null);
});

Deno.test("toRecord: returns the object itself for a plain row", () => {
  const row = { id: "abc", quote_number: "10001/25" };
  assertEquals(toRecord(row), row);
});

Deno.test("firstRowAsRecord: null for non-array/empty inputs", () => {
  assertEquals(firstRowAsRecord(null), null);
  assertEquals(firstRowAsRecord(undefined), null);
  assertEquals(firstRowAsRecord([]), null);
  assertEquals(firstRowAsRecord({ id: "x" }), null);
});

Deno.test("firstRowAsRecord: returns first row when present", () => {
  const rows = [{ id: "1" }, { id: "2" }];
  assertEquals(firstRowAsRecord(rows), { id: "1" });
});

Deno.test("firstRowAsRecord: ignores GenericStringError as first element", () => {
  const rows = [{ error: true, message: "boom" }];
  assertEquals(firstRowAsRecord(rows), null);
});

Deno.test("firstRowAsRecord: ignores primitives at index 0", () => {
  assertEquals(firstRowAsRecord([null]), null);
  assertEquals(firstRowAsRecord(["string"]), null);
  assertEquals(firstRowAsRecord([123]), null);
});
