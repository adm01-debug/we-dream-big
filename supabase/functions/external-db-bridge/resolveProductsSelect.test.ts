// Regression tests for the lightweight-select rule.
// HARD GUARD: lightweight is ONLY applied when table === 'products' AND limit > 50 AND no id.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveProductsSelect, LIGHTWEIGHT_LIMIT_THRESHOLD } from "./index.ts";

const LIGHTWEIGHT_PREFIX = "id,name,sku,sale_price"; // start of PRODUCTS_LIGHTWEIGHT_SELECT

Deno.test("non-products table: never forces lightweight", () => {
  const r = resolveProductsSelect({ table: "categories", select: "*", limit: 1000, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "not-products");
  assertEquals(r.effectiveSelect, "*");
});

Deno.test("products + id present: keeps caller select even at large limit", () => {
  const r = resolveProductsSelect({ table: "products", select: "*", limit: 5000, hasId: true });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "has-id");
  assertEquals(r.effectiveSelect, "*");
});

Deno.test("products + limit === threshold (50): NOT forced (boundary)", () => {
  const r = resolveProductsSelect({ table: "products", select: "*", limit: LIGHTWEIGHT_LIMIT_THRESHOLD, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "small-limit");
});

Deno.test("products + limit = 51 + select='*': FORCED (just above boundary)", () => {
  const r = resolveProductsSelect({ table: "products", select: "*", limit: 51, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "star-select-listing");
  assertEquals(r.effectiveSelect.startsWith(LIGHTWEIGHT_PREFIX), true);
});

Deno.test("products + small limit + select='*': keeps '*' (regression: detail/edit pages)", () => {
  const r = resolveProductsSelect({ table: "products", select: "*", limit: 1, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "small-limit");
  assertEquals(r.effectiveSelect, "*");
});

Deno.test("products + small limit + heavy JSONB select: keeps caller select (no over-eager swap)", () => {
  const r = resolveProductsSelect({ table: "products", select: "id,name,metadata,personalization_areas", limit: 10, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "small-limit");
  assertEquals(r.effectiveSelect, "id,name,metadata,personalization_areas");
});

Deno.test("products + large limit + heavy JSONB select: forced lightweight", () => {
  const r = resolveProductsSelect({ table: "products", select: "id,name,metadata", limit: 200, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "heavy-jsonb-listing");
});

Deno.test("products + large limit + omitted select: forced lightweight", () => {
  const r = resolveProductsSelect({ table: "products", select: undefined, limit: 500, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "star-select-listing");
});

Deno.test("products + large limit + focused/lightweight select: NOT forced (respect caller)", () => {
  const r = resolveProductsSelect({ table: "products", select: "id,name,sale_price,primary_image_url", limit: 500, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "caller-select");
  assertEquals(r.effectiveSelect, "id,name,sale_price,primary_image_url");
});

Deno.test("products + large limit + very wide select (>25 cols): forced lightweight", () => {
  const wideSelect = Array.from({ length: 30 }, (_, i) => `col${i}`).join(",");
  const r = resolveProductsSelect({ table: "products", select: wideSelect, limit: 500, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "wide-select-listing");
});

Deno.test("products + null/zero limit + select='*': defaults to small-limit (safe fallback)", () => {
  const r = resolveProductsSelect({ table: "products", select: "*", limit: null, hasId: false });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "small-limit");
});
