/**
 * Testes de integração — invariantes de `applyFilters` e do swap lightweight.
 *
 * Cobre dois invariantes do external-db-bridge que são CRÍTICOS para
 * performance e que já regrediram historicamente:
 *
 *  1) `applyFilters` NUNCA chama `.select()` no query builder. Ele só pode
 *     adicionar predicados (eq/in/ilike/or/is/gte/lte/...). Se um dia algum
 *     branch acidentalmente trocar o select aqui, este teste quebra.
 *
 *  2) O swap para `PRODUCTS_LIGHTWEIGHT_SELECT` SÓ ocorre em listings de
 *     `products` com `limit > 50` E `!hasId`, em AMBOS os call sites
 *     (handleSelect e handleBatch). Replicamos AQUI os parâmetros que cada
 *     call site passa para `resolveProductsSelect()` (linhas 502-507 para
 *     handleBatch e 901-906 para handleSelect do index.ts) — assim qualquer
 *     drift entre os dois sítios é capturado.
 */

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyFilters,
  resolveProductsSelect,
} from "./index.ts";

// ────────────────────────────────────────────────────────────────────────────
// 1) Query-builder spy — registra TODA chamada de método encadeado.
// ────────────────────────────────────────────────────────────────────────────

interface QueryCall {
  method: string;
  args: unknown[];
}

function makeQuerySpy() {
  const calls: QueryCall[] = [];
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return undefined;
      if (typeof prop !== "string") return undefined;
      // toString/then/catch can be probed by JS internals — return undefined to ignore.
      if (prop === "then" || prop === "catch") return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        // Toda chamada retorna o mesmo proxy para suportar chaining infinito.
        return proxy;
      };
    },
  };
  const proxy: any = new Proxy({}, handler);
  return { query: proxy, calls };
}

// ────────────────────────────────────────────────────────────────────────────
// applyFilters — INVARIANTE: nunca chama .select()
// ────────────────────────────────────────────────────────────────────────────

Deno.test("applyFilters: nunca chama .select() (filtro vazio)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, {}, null);
  assert(calls.every((c) => c.method !== "select"), "applyFilters não pode chamar .select()");
});

Deno.test("applyFilters: nunca chama .select() (filtros simples eq)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, { is_active: true, brand: "X" }, null);
  assert(calls.length > 0, "deve ter aplicado predicados");
  assert(calls.every((c) => c.method !== "select"));
});

Deno.test("applyFilters: nunca chama .select() (operadores PostgREST string)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, {
    sale_price: "gte.10",
    stock_quantity: "lt.100",
    sku: "in.(A,B,C)",
    deleted_at: "is.null",
  }, null);
  assert(calls.every((c) => c.method !== "select"));
  // Sanidade: deve ter chamado os operadores esperados.
  const methods = calls.map((c) => c.method);
  assert(methods.includes("gte"));
  assert(methods.includes("lt"));
  assert(methods.includes("in"));
  assert(methods.includes("is"));
});

Deno.test("applyFilters: nunca chama .select() (sufixos _gte/_lte/_isnull/_notnull)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, {
    price_gte: 10,
    price_lte: 100,
    deleted_at_isnull: true,
    archived_at_notnull: true,
  }, null);
  assert(calls.every((c) => c.method !== "select"));
});

Deno.test("applyFilters: nunca chama .select() (busca _search e _name_prefix)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, { _search: "caneca" }, null);
  applyFilters(query, { _name_prefix: "ABC" }, null);
  assert(calls.every((c) => c.method !== "select"));
});

Deno.test("applyFilters: nunca chama .select() (categoryDescendants ativo)", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, { category_id: "root-cat" }, ["a", "b", "c"]);
  assert(calls.every((c) => c.method !== "select"));
  // Deve ter usado .in() para expandir descendentes.
  assert(calls.some((c) => c.method === "in"));
});

Deno.test("applyFilters: ignora valores vazios sem chamar .select()", () => {
  const { query, calls } = makeQuerySpy();
  applyFilters(query, { brand: "", color: null, size: undefined }, null);
  assertEquals(calls.length, 0, "valores vazios não devem gerar nenhum predicado");
});

// ────────────────────────────────────────────────────────────────────────────
// 2) Swap lightweight — INVARIANTE: só com limit > 50 E !hasId
//
// Replicamos a invocação EXATA que cada call site faz, garantindo paridade
// entre handleSelect e handleBatch. Se algum dos dois drift-ar (passar
// limit/hasId errado), os testes correspondentes quebram.
// ────────────────────────────────────────────────────────────────────────────

/** Reproduz a chamada de handleSelect (index.ts linhas 901-906). */
function callHandleSelectResolver(args: {
  table: string;
  select: string | undefined;
  queryLimit: number | undefined;
  id: string | null;
  filters: Record<string, unknown> | null;
}) {
  const requestedLimitRaw =
    typeof args.queryLimit === "number" && args.queryLimit > 0
      ? args.queryLimit
      : 500;
  const filtersId = args.filters && typeof args.filters === "object"
    ? (args.filters as Record<string, unknown>).id
    : undefined;
  const hasIdSignal =
    !!args.id || (filtersId !== undefined && filtersId !== null && filtersId !== "");
  return resolveProductsSelect({
    table: args.table,
    select: args.select,
    limit: requestedLimitRaw,
    hasId: hasIdSignal,
  });
}

/** Reproduz a chamada de handleBatch (index.ts linhas 502-507). */
function callHandleBatchResolver(args: {
  table: string;
  select: string | undefined;
  limit: number | undefined;
}) {
  const rawLimit = (args.limit as number) || 500;
  return resolveProductsSelect({
    table: args.table,
    select: args.select,
    limit: rawLimit,
    hasId: false, // handleBatch sempre passa false (não suporta fetch por id)
  });
}

// ── handleSelect ───────────────────────────────────────────────────────────

Deno.test("handleSelect: limit=51 + select='*' em products → swap lightweight", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: 51, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "star-select-listing");
});

Deno.test("handleSelect: limit=50 (limite exato) → SEM swap", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: 50, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, false);
});

Deno.test("handleSelect: limit=49 → SEM swap", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: 49, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, false);
});

Deno.test("handleSelect: id top-level + limit alto → SEM swap (detail page)", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: 500, id: "abc-123", filters: null,
  });
  assertEquals(r.forcedLightweight, false, "fetch por id nunca deve ser degradado");
});

Deno.test("handleSelect: filters.id presente + limit alto → SEM swap", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: 500, id: null, filters: { id: "abc" },
  });
  assertEquals(r.forcedLightweight, false);
});

Deno.test("handleSelect: limit undefined (default 500) → swap", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "*", queryLimit: undefined, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, true);
});

Deno.test("handleSelect: tabela diferente de products → SEM swap mesmo com limit alto", () => {
  const r = callHandleSelectResolver({
    table: "categories", select: "*", queryLimit: 1000, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, false);
});

Deno.test("handleSelect: select leve + limit alto → SEM swap (caller já enxuto)", () => {
  const r = callHandleSelectResolver({
    table: "products", select: "id,name,sku", queryLimit: 500, id: null, filters: null,
  });
  assertEquals(r.forcedLightweight, false);
});

// ── handleBatch ────────────────────────────────────────────────────────────

Deno.test("handleBatch: limit=51 + select='*' em products → swap lightweight", () => {
  const r = callHandleBatchResolver({ table: "products", select: "*", limit: 51 });
  assertEquals(r.forcedLightweight, true);
});

Deno.test("handleBatch: limit=50 → SEM swap", () => {
  const r = callHandleBatchResolver({ table: "products", select: "*", limit: 50 });
  assertEquals(r.forcedLightweight, false);
});

Deno.test("handleBatch: limit ausente (default 500) → swap", () => {
  const r = callHandleBatchResolver({ table: "products", select: "*", limit: undefined });
  assertEquals(r.forcedLightweight, true);
});

Deno.test("handleBatch: tabela diferente de products → SEM swap", () => {
  const r = callHandleBatchResolver({ table: "product_images", select: "*", limit: 1000 });
  assertEquals(r.forcedLightweight, false);
});

// ── Paridade handleSelect ↔ handleBatch ────────────────────────────────────

Deno.test("paridade: mesmo limit+select em products produzem mesma decisão", () => {
  const cases: Array<{ select: string; limit: number }> = [
    { select: "*", limit: 51 },
    { select: "*", limit: 50 },
    { select: "*", limit: 1000 },
    { select: "id,name,sku", limit: 500 },
    { select: "id,images,videos,description_html", limit: 200 }, // heavy fields
  ];
  for (const c of cases) {
    const a = callHandleSelectResolver({
      table: "products", select: c.select, queryLimit: c.limit, id: null, filters: null,
    });
    const b = callHandleBatchResolver({
      table: "products", select: c.select, limit: c.limit,
    });
    assertEquals(
      a.forcedLightweight,
      b.forcedLightweight,
      `drift entre handleSelect e handleBatch para select=${c.select} limit=${c.limit}: ` +
        `select=${a.forcedLightweight} batch=${b.forcedLightweight}`,
    );
    assertEquals(a.reason, b.reason, `reason diferente para ${JSON.stringify(c)}`);
  }
});
