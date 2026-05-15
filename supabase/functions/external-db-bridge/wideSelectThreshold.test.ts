// Tests para a Rule B (wide-select-listing) com threshold configurável de colunas.
// Garante que:
//   1) O threshold default é 25 (compat com testes anteriores).
//   2) Selects com `cols > threshold` em listagens (limit > 50, sem id) são forçados a lightweight.
//   3) Selects com `cols <= threshold` mantêm o select do caller (sem swap).
//   4) O log estruturado inclui `columnThreshold` e `exceededColumnThreshold`.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  resolveProductsSelect,
  WIDE_SELECT_COLUMN_THRESHOLD,
  logSelectDecision,
} from "./index.ts";

function buildSelect(n: number): string {
  // Usa nomes neutros (col_N) que NÃO estão em HEAVY_PRODUCT_COLUMNS,
  // para isolar a Rule B (wide) das demais regras.
  return Array.from({ length: n }, (_, i) => `col_${i}`).join(",");
}

Deno.test("wide-threshold: default é 25 (compat)", () => {
  assertEquals(WIDE_SELECT_COLUMN_THRESHOLD, 25);
});

Deno.test("wide-threshold: cols == threshold NÃO força lightweight", () => {
  const r = resolveProductsSelect({
    table: "products",
    select: buildSelect(WIDE_SELECT_COLUMN_THRESHOLD),
    limit: 100,
    hasId: false,
  });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "caller-select");
});

Deno.test("wide-threshold: cols > threshold força lightweight (Rule B)", () => {
  const r = resolveProductsSelect({
    table: "products",
    select: buildSelect(WIDE_SELECT_COLUMN_THRESHOLD + 1),
    limit: 100,
    hasId: false,
  });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "wide-select-listing");
});

Deno.test("wide-threshold: limit <= 50 NÃO força lightweight, mesmo com muitas colunas", () => {
  const r = resolveProductsSelect({
    table: "products",
    select: buildSelect(WIDE_SELECT_COLUMN_THRESHOLD + 50),
    limit: 50,
    hasId: false,
  });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "small-limit");
});

Deno.test("wide-threshold: log estruturado registra columnThreshold + exceededColumnThreshold", () => {
  const captured: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(" "));
  };
  try {
    logSelectDecision({
      callSite: "handleSelect",
      table: "products",
      callerSelect: buildSelect(WIDE_SELECT_COLUMN_THRESHOLD + 1),
      effectiveLimit: 100,
      hasId: false,
      resolved: {
        effectiveSelect: "id,name",
        forcedLightweight: true,
        reason: "wide-select-listing",
      },
    });
  } finally {
    console.log = originalLog;
  }

  assertEquals(captured.length, 1);
  const line = captured[0];
  // Deve incluir o threshold de colunas no payload e na linha humana
  if (!line.includes(`"columnThreshold":${WIDE_SELECT_COLUMN_THRESHOLD}`)) {
    throw new Error(`log não inclui columnThreshold: ${line}`);
  }
  if (!line.includes(`"exceededColumnThreshold":true`)) {
    throw new Error(`log não inclui exceededColumnThreshold=true: ${line}`);
  }
  if (!line.includes(`col_threshold=${WIDE_SELECT_COLUMN_THRESHOLD}`)) {
    throw new Error(`log humano não inclui col_threshold=: ${line}`);
  }
});
